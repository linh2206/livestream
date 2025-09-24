#!/bin/bash

# Quick reset admin user script
echo "🔄 Resetting admin user..."

# Delete all users and create new admin
docker exec livestream-mongodb mongo livestream --eval "
db.users.deleteMany({});
db.users.insertOne({
  username: 'admin',
  email: 'admin@livestream.com', 
  password: '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  avatar: '',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
print('✅ Admin user created');
"

echo ""
echo "🔑 Login credentials:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "🌐 Login at: http://localhost:3000"

