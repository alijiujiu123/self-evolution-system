#!/bin/bash

################################################################################
# Quick Test: Verify Evolution System Deployment Files
################################################################################

echo "🧪 Testing Evolution System Deployment Files"
echo "=============================================="
echo ""

ERRORS=0

# Test 1: Service file exists
echo "Test 1: Checking systemd service file..."
if [ -f "systemd/openclaw-evolution.service" ]; then
    echo "✅ Service file exists"
    
    # Validate service file syntax
    if systemd-analyze verify systemd/openclaw-evolution.service 2>/dev/null; then
        echo "✅ Service file syntax valid"
    else
        echo "⚠️  Service file has warnings (may need systemd running)"
    fi
else
    echo "❌ Service file not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 2: Install script is executable
echo "Test 2: Checking install script..."
if [ -x "install.sh" ]; then
    echo "✅ Install script is executable"
    
    # Check for shebang
    if head -1 install.sh | grep -q "#!/bin/bash"; then
        echo "✅ Install script has valid shebang"
    else
        echo "⚠️  Install script may be missing shebang"
    fi
else
    echo "❌ Install script not executable"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 3: Documentation exists
echo "Test 3: Checking documentation..."
if [ -f "README.md" ]; then
    echo "✅ README.md exists"
    
    # Check for key sections
    if grep -q "systemd" README.md && grep -q "cron" README.md; then
        echo "✅ Documentation covers systemd and cron"
    else
        echo "⚠️  Documentation may be incomplete"
    fi
else
    echo "❌ README.md not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "CRON.md" ]; then
    echo "✅ CRON.md exists"
else
    echo "⚠️  CRON.md not found (optional)"
fi
echo ""

# Test 4: File permissions
echo "Test 4: Checking file permissions..."
PERM_ERRORS=0

for file in systemd/openclaw-evolution.service install.sh README.md CRON.md; do
    if [ -f "$file" ]; then
        PERM=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
        echo "  $file: $PERM"
    fi
done
echo ""

# Summary
echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Review documentation: cat README.md"
    echo "  2. Run installation: sudo ./install.sh"
    echo "  3. Verify service: sudo systemctl status openclaw-evolution"
    exit 0
else
    echo "❌ $ERRORS error(s) found"
    echo "Please fix the issues above"
    exit 1
fi
