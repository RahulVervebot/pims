// components/ReportHeader.js
import React from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity, Text } from 'react-native';
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
    <TouchableOpacity
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Tabs');
        }
      }}
      style={styles.leftIcon}
    >
      <Ionicons name="arrow-back-outline" size={24} color="#fff" />
    </TouchableOpacity>

    <View style={styles.titleWrap}>
      <Text
        style={styles.headerTitle}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {Title}
      </Text>
    </View>

    <View style={styles.rightSpacer} />
  </View>
);


  return <View>{renderBackground()}</View>;
};

const styles = StyleSheet.create({
  logo: { flexDirection: 'row' },
  headerContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  content: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  rowIcon: { width: 36, height: 36 },
  leftIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSpacer: { width: 36, height: 36 },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },

  headerUser: { fontSize: 12, fontWeight: '400', color: '#000', paddingHorizontal: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#000', paddingHorizontal: 10 },
  profileBtn: {},
});


export default AppHeader;
