// components/CustomHeader.js
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import Profile from "../assets/icons/Profile.svg"
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import ProductSearch from './ProductSearch';

const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val }); // <-- add this

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
  if (backgroundType === "image") {
    return (
      <ImageBackground
        source={getImageSource(backgroundValue)}
        style={styles.headerContainer}
        resizeMode="cover"
      >
        {renderContent()}
        {children}  {/* <-- now inside the background */}
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
    <>
      <View style={styles.content}>
        <TouchableOpacity onPress={onAddressPress}>
          <Text style={styles.addressText}>{address}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Profile width={120} height={40} />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View>
      {renderBackground()}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 15,
    paddingTop: 40,
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
