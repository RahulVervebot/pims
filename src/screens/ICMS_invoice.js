import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, Text, TextInput,Platform, FlatList, TouchableOpacity,StyleSheet,ImageBackground} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import axios from "axios";
import AppHeader from '../components/AppHeader';
import reportbg from '../assets/images/report-bg.png';
// const baseUrl = 'https://icmsfrontend.vervebot.io'; // production URL
const baseUrl = 'http://192.168.1.52:3006'; // development URL
 // Replace with your actual base URL

 const getImageSource = val => (typeof val === 'number' ? val : { uri: val });

const fetchInvoices = async (vendor) => {
  try {
    console.log("Fetching invoices for vendor:", vendor);
    console.log("URL:", `${baseUrl}/api/invoice/getsavedinvoices`);

    const response = await axios.get(`${baseUrl}/api/invoice/getsavedinvoices`, {
      headers: {
        "Content-Type": "application/json",
        store: "deepanshu_test",
        "mobile-auth": "true",
      },
      params: {
        ...vendor,
      },
      timeout: 100000,
    });

    // console.log("Fetched invoices response:", response.data);

    // Ensure we always return an array
    return response.data || [];
  } catch (error) {
    if (error.response) {
      console.error("Server error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("No response received:", error);
    } else {
      console.error("Error setting up request:", error.message);
    }
    return [];
  }
};



export default function InvoiceList() {
  const navigation = useNavigation();
  const route = useRoute();
  const {vendor} = route.params;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceList, setInvoiceList] = useState([]);
   useEffect(() => {
  if (vendor) {
    AsyncStorage.setItem('vendor', JSON.stringify(vendor))
      .then(() => console.log('Vendor saved to AsyncStorage'))
      .catch(err => console.error('Error saving vendor:', err));
  }
}, [vendor]);
  
 useEffect(() => {
  const loadInvoices = async () => {
    setLoading(true);
    console.log('Loading invoices for vendor:', vendor);

    const fetchedInvoices = await fetchInvoices(vendor);

    // console.log('Fetched invoices:', fetchedInvoices);

    const sorted = fetchedInvoices
      .sort((a, b) => {
        let dateA = new Date(a.SavedDate);
        let dateB = new Date(b.SavedDate);
        if (dateA > dateB) return -1;
        else if (dateA < dateB) return 1;
        else return 0;
      })
      .sort((x, y) => {
        if (x.InvoiceStatus < y.InvoiceStatus) return 1;
        if (x.InvoiceStatus > y.InvoiceStatus) return -1;
        return 0;
      });

    setInvoiceList(sorted);
    setLoading(false);
  };
  loadInvoices();
}, []);


  const handleInvoiceSearch = text => {
    setInvoiceSearch(text);

   let results = [...invoiceList]; // instead of dummyInvoices

    if (text.trim() !== '') {
      results = results.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(text.toLowerCase()),
      );
    }

    // always keep new invoices on top
    results.sort((a, b) => {
      if (a.number_of_newInvoice < b.number_of_newInvoice) return 1;
      if (a.number_of_newInvoice > b.number_of_newInvoice) return -1;
      return 0;
    });

    setInvoiceList(results);
  };

  return (
    <ImageBackground
          source={getImageSource(reportbg)}
          style={styles.screen}
          resizeMode="cover"
        >
          <AppHeader
            Title="Invoice List"
            backgroundType="image"
            backgroundValue={reportbg}
          ></AppHeader>
    <View style={styles.panelInner}>
      <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 10}}>
        Invoices for {vendor.value}
      </Text>

      <TextInput
        value={invoiceSearch}
        onChangeText={handleInvoiceSearch}
        placeholder="Search Invoice No..."
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 10,
        }}
      />
      {loading ? (
        <Text style={{textAlign: 'center', color: '#888'}}>Loading invoices...</Text>
      ) : (
      <FlatList
        data={invoiceList}
        keyExtractor={item => item.SavedInvoiceNo.toString()}
        renderItem={({item, index}) => (
          <View
            style={{
              flexDirection: 'row',
              padding: 10,
              borderBottomWidth: 1,
              borderColor: '#ddd',
              backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff',
              alignItems: 'center',
            }}>
            <Text style={{flex: 1}}>{item.SavedInvoiceNo}</Text>
            <Text style={{flex: 1}}>{item.SavedDate}</Text>

            {item.InvoiceStatus === 'not_seen' && (
              <View
                style={{
                  backgroundColor: 'blue',
                  borderRadius: 12,
                  paddingHorizontal: 6,
                  marginRight: 10,
                }}>
                <Text style={{color: 'white', fontSize: 12}}>new</Text>
              </View>
            )}

            <TouchableOpacity
              style={{flex: 1}}
              onPress={() =>
                navigation.navigate('InvoiceDetails', {Invoice: item})
              }>
              <Text style={{color: 'blue'}}>Open</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={{textAlign: 'center', color: '#888', marginTop: 20}}>
            No invoices found
          </Text>
        )}
      
    
    
      />)}
    </View>
    </ImageBackground>
  );
}

const styles = 
StyleSheet.create({
  screen: {
    flex: 1,
  },
   panelInner: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.85)', // helps separate items from bg image
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical:  10,
        paddingHorizontal:12,
        
  
        ...Platform.select({
          android: { elevation: 1 },
          ios: {
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          },
        }),
      },
});
