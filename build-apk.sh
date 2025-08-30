#!/bin/zsh
# Script to build a release APK for the Feedit React Native app

set -e

# Install JS dependencies
if [ -f package.json ]; then
  echo "Installing JS dependencies..."
  yarn install || npm install
fi

# Navigate to android folder
cd android

# Clean previous builds
./gradlew clean

# Build release APK
./gradlew assembleRelease

# Output APK path
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo "\nAPK generated: $APK_PATH"
else
  echo "\nAPK build failed. Check for errors above."
  exit 1
fi
