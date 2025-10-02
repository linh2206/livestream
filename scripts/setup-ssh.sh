#!/bin/bash

echo "🔐 Setting up SSH Server"
echo "========================"

# Create SSH directory
echo "📁 Creating SSH directory..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate SSH key if it doesn't exist
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔑 Generating SSH key..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH key generated!"
else
    echo "✅ SSH key already exists!"
fi

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Display public key
echo ""
echo "📋 Your SSH public key:"
echo "========================"
cat ~/.ssh/id_rsa.pub
echo "========================"

echo ""
echo "✅ SSH server setup completed!"
echo "You can now use SSH with your generated key."
echo "========================"

