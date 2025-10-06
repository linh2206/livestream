#!/bin/bash

echo "Resetting Admin Password to admin123"
echo "======================================="

# Check if MongoDB container is running
if ! docker ps | grep -q mongodb; then
    echo "MongoDB container is not running."
    echo "Please start the services first with: ./build-start.sh"
    exit 1
fi

# Reset all users password to admin123
echo "Resetting all users password to admin123..."
docker exec livestream-mongodb mongo livestream -u admin -p admin123 --authenticationDatabase admin --eval "
    // Update all users password to admin123 (bcrypt hash)
    const result = db.users.updateMany(
        {},
        {
            \$set: {
                password: '\$2a\$10\$q02BmAqsEtwr4AMCSPCUbelEj7FNaeFAQ/VnluWgugQTxTPhVFz1S',
                role: 'admin'
            }
        }
    );
    
    print('Updated ' + result.modifiedCount + ' users with password admin123 and admin role');
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Admin password reset successfully!"
    echo ""
    echo "Login credentials:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
    echo "Access your application at:"
    echo "   Frontend: \${FRONTEND_URL}"
    echo "   API: \${API_BASE_URL}"
else
    echo "Failed to reset admin password"
    echo "Make sure MongoDB is running and accessible"
    exit 1
fi

echo "======================================="
