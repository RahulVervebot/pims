// components/ReportHeader.js
import React,{useEffect,useState} from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity,Image,Text  } from 'react-native';
import Profile from "../assets/icons/Profile.svg";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

const AppHeader = ({ 
  Title, 
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

      <TouchableOpacity  onPress={() => {
       if (navigation.canGoBack()) {
         navigation.goBack();
       } else {
         navigation.navigate('Tabs'); // fallback screen
       }
     }} style={styles.leftIcon}>
      <Ionicons name="arrow-back-outline" size={24} color="#000" />
         </TouchableOpacity>
    {/* Center (absolute) */}
    <View style={styles.titleOverlay} pointerEvents="none">
      <Text
        style={styles.headerTitle}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {Title}
      </Text>
    </View>

  </View>
);


  return <View>{renderBackground()}</View>;
};

const styles = StyleSheet.create({
  logo: { flexDirection: 'row' },
  headerContainer: {
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  content: {
    position: 'relative',
    minHeight: 48,                 // give the row some height to center against
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
     paddingTop: 30
  },
  rowIcon: { width: 36, height: 36 },

  // ⬇️ Absolute centered title
  titleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 30
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 80,         // reserves space so it won’t overlap icons
    textAlign: 'center',
  },

  headerUser: { fontSize: 12, fontWeight: '400', color: '#000', paddingHorizontal: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#000', paddingHorizontal: 10 },
  profileBtn: { },
});


export default AppHeader;
