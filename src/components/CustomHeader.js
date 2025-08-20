// components/CustomHeader.js
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import Profile from "../assets/icons/Profile.svg"
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
const CustomHeader = ({ 
  address = "Select Address", 
  onProfilePress, 
  onAddressPress, 
  backgroundType = "color", 
  backgroundValue = "#fff", 
  children 
}) => {
        const navigation = useNavigation();
  const renderBackground = () => {
    if (backgroundType === "image" || backgroundType === "gif") {
      return (
       <ImageBackground
          source={
            backgroundType === "gif"
              ? typeof backgroundValue === "string"
                ? { uri: backgroundValue }
                : backgroundValue // local require("...")
              : { uri: backgroundValue }
          }
          style={styles.headerContainer}
          resizeMode="cover"
        >
          {renderContent()}
        </ImageBackground>
      );
    } else {
      return (
        <View style={[styles.headerContainer, { backgroundColor: backgroundValue }]}>
          {renderContent()}
        </View>
      );
    }
  };

  const renderContent = () => (
    <View style={styles.content}>
      {/* Left: Address */}
      <TouchableOpacity onPress={onAddressPress}>
        <Text style={styles.addressText}>{address}</Text>
      </TouchableOpacity>

      {/* Right: Profile Icon */}
      <TouchableOpacity     onPress={() => navigation.navigate('Profile')}>
        {/* Example if you have SVG file */}
       <Profile width={120} height={40} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      {renderBackground()}
      {/* Optional children under header (categories, etc.) */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default CustomHeader;
