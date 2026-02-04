#!/bin/bash

################################################################################
# OpenClaw Evolution System - Production Installation Script
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="openclaw-evolution"
SERVICE_FILE="${SCRIPT_DIR}/systemd/${SERVICE_NAME}.service"
SKILL_DIR="/usr/local/lib/node_modules/openclaw/skills/evolution"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

################################################################################
# Pre-flight Checks
################################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    print_success "Running as root"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found"
        exit 1
    fi
    NODE_VERSION=$(node -v)
    print_success "Node.js: ${NODE_VERSION}"
    
    # Check if skill directory exists
    if [ ! -d "${SKILL_DIR}" ]; then
        print_error "Evolution skill not found at ${SKILL_DIR}"
        print_info "Please install the skill first"
        exit 1
    fi
    print_success "Skill directory exists"
    
    # Check systemd
    if ! command -v systemctl &> /dev/null; then
        print_error "systemd not found"
        exit 1
    fi
    print_success "systemd available"
    
    # Check knowledge directory
    KNOWLEDGE_DIR="/root/.openclaw/knowledge"
    if [ ! -d "${KNOWLEDGE_DIR}" ]; then
        print_info "Creating knowledge directory"
        mkdir -p "${KNOWLEDGE_DIR}"
        chmod 700 "${KNOWLEDGE_DIR}"
    fi
    print_success "Knowledge directory ready"
}

################################################################################
# Installation
################################################################################

install_systemd_service() {
    print_header "Installing Systemd Service"
    
    # Check if service file exists
    if [ ! -f "${SERVICE_FILE}" ]; then
        print_error "Service file not found: ${SERVICE_FILE}"
        exit 1
    fi
    
    # Copy service file
    print_info "Copying service file to /etc/systemd/system/"
    cp "${SERVICE_FILE}" /etc/systemd/system/
    chmod 644 /etc/systemd/system/${SERVICE_NAME}.service
    
    print_success "Service file installed"
}

create_cron_job() {
    print_header "Configuring Cron Job"
    
    # Check if OpenClaw cron is available
    if command -v openclaw &> /dev/null; then
        print_info "Using OpenClaw cron system"
        
        # Create cron job via OpenClaw
        cat > /tmp/evolution-cron.json <<EOF
{
  "name": "evolution-learning-cycle",
  "schedule": {
    "kind": "cron",
    "expr": "*/30 * * * *",
    "tz": "Asia/Shanghai"
  },
  "payload": {
    "kind": "systemEvent",
    "text": "Run Evolution System learning cycle: cd ${SKILL_DIR} && node index.js learn"
  },
  "sessionTarget": "main",
  "enabled": true
}
EOF
        
        print_info "To create cron job, run:"
        echo ""
        echo "  openclaw cron add --job /tmp/evolution-cron.json"
        echo ""
        print_warning "Or add this manually using: openclaw cron add --schedule '*/30 * * * *' --session main --payload '{\"kind\":\"systemEvent\",\"text\":\"Run Evolution System learning cycle: cd ${SKILL_DIR} && node index.js learn\"}'"
        
    else
        print_info "OpenClaw cron not available, using system crontab"
        
        # Add to root crontab
        TEMP_CRON=$(mktemp)
        crontab -l > "${TEMP_CRON}" 2>/dev/null || true
        
        # Check if already exists
        if grep -q "evolution.*index.js learn" "${TEMP_CRON}" 2>/dev/null; then
            print_warning "Cron job already exists"
        else
            # Add cron job
            echo "*/30 * * * * cd ${SKILL_DIR} && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1" >> "${TEMP_CRON}"
            crontab < "${TEMP_CRON}"
            print_success "Cron job added to root crontab"
        fi
        
        rm -f "${TEMP_CRON}"
    fi
}

configure_environment() {
    print_header "Environment Configuration"
    
    # Create config directory
    mkdir -p /etc/openclaw
    
    # Prompt for GitHub token (optional)
    echo ""
    read -p "Enter GitHub token (optional, press Enter to skip): " GITHUB_TOKEN
    
    if [ -n "${GITHUB_TOKEN}" ]; then
        cat > /etc/openclaw/evolution.conf <<EOF
# Evolution System Environment Variables
EVOLUTION_GITHUB_TOKEN=${GITHUB_TOKEN}
EOF
        chmod 600 /etc/openclaw/evolution.conf
        print_success "GitHub token configured"
        
        # Update service file to use EnvironmentFile
        sed -i '/\[Service\]/a EnvironmentFile=/etc/openclaw/evolution.conf' /etc/systemd/system/${SERVICE_NAME}.service
    else
        print_info "Skipping GitHub token (can add later)"
    fi
}

################################################################################
# Start Service
################################################################################

start_service() {
    print_header "Starting Service"
    
    # Reload systemd
    print_info "Reloading systemd daemon"
    systemctl daemon-reload
    
    # Enable service (start on boot)
    print_info "Enabling service (auto-start on boot)"
    systemctl enable ${SERVICE_NAME}
    
    # Start service
    print_info "Starting service"
    systemctl start ${SERVICE_NAME}
    
    # Wait a moment
    sleep 2
    
    # Check status
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        print_success "Service started successfully"
    else
        print_error "Service failed to start"
        print_info "Check logs: journalctl -u ${SERVICE_NAME} -n 50"
        exit 1
    fi
}

################################################################################
# Verification
################################################################################

verify_installation() {
    print_header "Verifying Installation"
    
    # Check service status
    print_info "Service status:"
    systemctl status ${SERVICE_NAME} --no-pager -l || true
    
    echo ""
    
    # Show recent logs
    print_info "Recent logs:"
    journalctl -u ${SERVICE_NAME} -n 10 --no-pager || true
    
    echo ""
    
    # Test manual learning cycle
    print_info "Testing manual learning cycle..."
    cd ${SKILL_DIR}
    if node index.js status > /dev/null 2>&1; then
        print_success "Evolution system responding"
    else
        print_warning "Evolution system not responding (may need dependencies)"
        print_info "Run: cd ${SKILL_DIR} && npm install"
    fi
}

################################################################################
# Post-Install Instructions
################################################################################

print_post_install() {
    print_header "Installation Complete"
    
    cat <<EOF

${GREEN}✅ OpenClaw Evolution System installed successfully!${NC}

${YELLOW}📋 Next Steps:${NC}

1. ${GREEN}Check service status${NC}:
   sudo systemctl status ${SERVICE_NAME}

2. ${GREEN}View live logs${NC}:
   sudo journalctl -u ${SERVICE_NAME} -f

3. ${GREEN}Run manual learning cycle${NC}:
   cd ${SKILL_DIR}
   node index.js learn

4. ${GREEN}Generate status report${NC}:
   node index.js report

${YELLOW}🔧 Management Commands:${NC}

  Restart:  sudo systemctl restart ${SERVICE_NAME}
  Stop:     sudo systemctl stop ${SERVICE_NAME}
  Start:    sudo systemctl start ${SERVICE_NAME}
  Disable:  sudo systemctl disable ${SERVICE_NAME}

${YELLOW}📊 Monitoring:${NC}

  Token usage:   sqlite3 /root/.openclaw/knowledge/evolution.db "SELECT * FROM token_metrics ORDER BY timestamp DESC LIMIT 10"
  Efficiency:    cd ${SKILL_DIR} && node lib/utils/efficiency-report.cjs

${YELLOW}⚙️  Configuration${NC}:

  Service file:  /etc/systemd/system/${SERVICE_NAME}.service
  Edit:          sudo nano /etc/systemd/system/${SERVICE_NAME}.service
  Reload:        sudo systemctl daemon-reload && sudo systemctl restart ${SERVICE_NAME}

  Config file:   ${SKILL_DIR}/evolution-config.json
  Database:      /root/.openclaw/knowledge/evolution.db

${YELLOW}📚 Documentation${NC}:

  Full guide: ${SCRIPT_DIR}/README.md

EOF
}

################################################################################
# Main
################################################################################

main() {
    print_header "OpenClaw Evolution System - Production Installation"
    
    print_info "This will install:"
    echo "  • Systemd service (24/7 process with auto-restart)"
    echo "  • Cron job (periodic learning cycles)"
    echo "  • Environment configuration"
    echo ""
    
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi
    
    # Run installation steps
    check_prerequisites
    install_systemd_service
    create_cron_job
    configure_environment
    start_service
    verify_installation
    print_post_install
}

# Run main
main "$@"
