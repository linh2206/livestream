#!/bin/bash

# Quick reset admin user script
echo "🔄 Resetting admin user..."

# Delete all users and create new admin
docker exec livestream-mongodb mongo livestream --eval "
db.users.deleteMany({});
       db.users.insertOne({
         username: 'admin',
         email: 'admin@livestream.com', 
         password: '\$2a\$10\$Mhx.XmB9aZodA2bq9.st3uD/TeRkHD3oEZmsCGBn/rFO5RGHxHRD.',
         avatar: '',
         fullName: 'Administrator',
         provider: 'local',
         role: 'admin',
         isEmailVerified: true,
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
print('✅ Admin user created');
"

echo ""
echo "🔑 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🌐 Login at: http://localhost:3000"

