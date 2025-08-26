// components/CustomHeader.js
import React from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import Profile from "../assets/icons/Profile.svg";
import TulsiLogo from '../assets/images/Tulsi.svg';
import { useNavigation } from '@react-navigation/native';

const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

const CustomHeader = ({ 
  onProfilePress, 
  backgroundType = "color", 
  backgroundValue = "#fff", 
  children 
}) => {
  const navigation = useNavigation();

  const renderBackground = () => {
    if (backgroundType === "image") {
      return (
        <ImageBackground
          source={getImageSource(backgroundValue)}
          style={styles.headerContainer}
          resizeMode="cover"
        >
          {renderContent()}
          {children}
        </ImageBackground>
      );
    } 
    return (
      <View style={[styles.headerContainer, { backgroundColor: backgroundValue }]}>
        {renderContent()}
        {children}
      </View>
    );
  };

  const renderContent = () => (
    <View style={styles.content}>
      {/* Left side - Tulsi Logo (navigates to MainDrawer) */}
      <View style={styles.logo}>
        <TulsiLogo width={50} height={50} />
</View>
      {/* Right side - Profile Icon */}
      <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
        <Profile width={40} height={40} />
      </TouchableOpacity>
    </View>
  );

  return <View>{renderBackground()}</View>;
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

});

export default CustomHeader;
