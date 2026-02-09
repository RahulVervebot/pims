import React, { useEffect, useMemo, useState } from 'react';
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
import HomeIcon from '../assets/icons/Products.svg';
import ReportIcon from '../assets/icons/Reportsicon.svg';
import POSIcon from '../assets/icons/payment_2.svg';
import TulsiIcon from '../assets/icons/inventory_1.svg';
const LIGHT_GREEN = '#e6f6ec';
const HEADER_FALLBACK = '#ffffff';

const cards = [
  {
    key: 'products',
    title: 'Products',
    subtitle: 'Manage Products',
    icon: HomeIcon,
    target: 'ProductScreen',
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
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');

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

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        const storedRole = await AsyncStorage.getItem('userRole');
        setUserName(storedName || '');
        setUserEmail(storedEmail || '');
        setUserRole(storedRole || '');
      } catch (e) {
        setUserName('');
        setUserEmail('');
        setUserRole('');
      }
    };
    loadUser();
  }, []);

  const initials = useMemo(() => {
    if (!userName) return 'U';
    const parts = userName.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }, [userName]);

  const prettyRole = useMemo(() => (userRole ? userRole.replace(/_/g, ' ') : ''), [userRole]);
  const statusBg = headerBg.type === 'image' ? 'transparent' : headerBg.value;
  const statusStyle = headerBg.type === 'image' ? 'light-content' : 'dark-content';

return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={statusBg} barStyle={statusStyle} />
      <CustomHeader Title="Dashboard" backgroundType={headerBg.type} backgroundValue={headerBg.value} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.userCard}
          activeOpacity={0.85}
        >
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName || 'User'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {userEmail || '—'}
              </Text>
              {!!prettyRole && (
                <View style={styles.userRoleBadge}>
                  <Text style={styles.userRoleText}>{prettyRole}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('SettingScreen')}
              activeOpacity={0.85}
            >
              <Text style={styles.settingsButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

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
  userCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#cfe9d9',
    shadowColor: '#0f2f19',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5fff8',
    borderWidth: 2,
    borderColor: '#2a8a4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2a8a4f',
    letterSpacing: 1,
  },
  userMeta: {
    flex: 1,
  },
  settingsButton: {
    backgroundColor: '#2a8a4f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#163e25',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4f6f5d',
    marginBottom: 6,
  },
  userRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#d7f2df',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#cfe9d9',
  },
  userRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2a8a4f',
    textTransform: 'capitalize',
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