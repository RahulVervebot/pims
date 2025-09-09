// components/CustomHeader.js
import React,{useEffect,useState} from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity,Image,Text  } from 'react-native';
import Profile from "../assets/icons/Profile.svg";
import TulsiLogo from '../assets/images/Tulsi.svg';
import TulsiWhiteLogo from '../assets/icons/Icon_Tulsi.png'
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

  
const CustomHeader = ({ 
  Title, 
  backgroundType = "color", 
  backgroundValue = "#fff", 
  children
}) => {
  const navigation = useNavigation();
    const [user_name, setUserName] = useState('');
  const [user_email, setUserEmail] = useState('');
  const [user_role, setUserRole] = useState('');
  const toTitleCase = (s = '') =>
  s
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-’'])([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const userName = await AsyncStorage.getItem('userName');
        const userEmail = await AsyncStorage.getItem('userEmail');
        const userRole = await AsyncStorage.getItem('userRole');

        setUserEmail(userEmail);
        setUserName(userName);
        setUserRole(userRole);
      } catch (e) {
        navigation.replace('Login');
      }
    };
    checkLogin();
  }, []);


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
    {/* Left */}
    <View style={styles.logo}>
      <Image source={TulsiWhiteLogo} style={styles.rowIcon} />
      <View>
        <Text style={styles.headerUser}>Hello,</Text>
        <Text style={styles.headerName}>{toTitleCase(user_name)}</Text>
      </View>
    </View>

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

    {/* Right */}
    <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
      <Profile width={36} height={36} />
    </TouchableOpacity>
  </View>
);


  return <View>{renderBackground()}</View>;
};

const styles = StyleSheet.create({
  logo: { flexDirection: 'row' },
  headerContainer: {
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  content: {
    position: 'relative',
    minHeight: 48,                 // give the row some height to center against
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
  },
  rowIcon: { width: 36, height: 36 },

  // ⬇️ Absolute centered title
  titleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 80,         // reserves space so it won’t overlap icons
    textAlign: 'center',
    paddingTop: 30
  },

  headerUser: { fontSize: 12, fontWeight: '400', color: '#000', paddingHorizontal: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#000', paddingHorizontal: 10 },
  profileBtn: { },
});


export default CustomHeader;
