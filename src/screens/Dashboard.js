import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomHeader from '../components/CustomHeader';
import HomeIcon from '../assets/icons/HomeIcon.svg';
import ReportIcon from '../assets/icons/Reportsicon.svg';
import POSIcon from '../assets/icons/payment_2.svg';
import TulsiIcon from '../assets/icons/tulsi-Icon-03.svg';
const LIGHT_GREEN = '#e6f6ec';
const HEADER_FALLBACK = '#ffffff';

const cards = [
  {
    key: 'products',
    title: 'Products',
    subtitle: 'Manage Products',
    icon: HomeIcon,
    target: 'Home',
  },
  {
    key: 'report',
    title: 'Report',
    subtitle: 'Sales & analytics',
    icon: ReportIcon,
    target: 'Report',
  },
  {
    key: 'pos',
    title: 'POS Management',
    subtitle: 'Manager your POS',
    icon: POSIcon,
    target: 'POSScreen',
  },
  {
    key: 'tulsi-ai',
    title: 'TulsiAI',
    subtitle: 'Inventory Management',
    icon: TulsiIcon,
    target: 'ICMSScreen',
  },
];

export default function Dashboard() {
  const navigation = useNavigation();
  const [headerBg, setHeaderBg] = useState({ type: 'color', value: HEADER_FALLBACK });

  useEffect(() => {
    const loadHeader = async () => {
      try {
        const topBanner = await AsyncStorage.getItem('topabanner');
        if (topBanner) {
          setHeaderBg({ type: 'image', value: topBanner });
        } else {
          setHeaderBg({ type: 'color', value: HEADER_FALLBACK });
        }
      } catch (e) {
        setHeaderBg({ type: 'color', value: HEADER_FALLBACK });
      }
    };
    loadHeader();
  }, []);

  const statusBg = headerBg.type === 'image' ? 'transparent' : headerBg.value;
  const statusStyle = headerBg.type === 'image' ? 'light-content' : 'dark-content';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={statusBg} barStyle={statusStyle} />
      <CustomHeader Title="Dashboard" backgroundType={headerBg.type} backgroundValue={headerBg.value} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <TouchableOpacity
                key={card.key}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(card.target)}
              >
                <View style={styles.iconWrap}>
                  <Icon width={28} height={28} fill={styles.iconFill.color} />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_GREEN,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f2f19',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#cfe9d9',
    shadowColor: '#0f2f19',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#d7f2df',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconFill: {
    color: '#2a8a4f',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#163e25',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4f6f5d',
  },
});
