PrintSales.js

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Image, TouchableOpacity, Modal, KeyboardAvoidingView, StyleSheet, ActivityIndicator, Alert, Dimensions, Platform } from "react-native";
import { styles } from "./AppStyles";
import EditImageModel from "../components/EditImageModel";
import ImagePicker from 'react-native-image-crop-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import editImage from '../images/editImage.png';
import SelectDropdown from 'react-native-select-dropdown';
import CheckBox from 'react-native-check-box';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { color } from "react-native-reanimated";
// import QRCodeScanner from 'react-native-qrcode-scanner';
import { Camera, CameraType, FlashMode } from 'react-native-camera-kit';
import { set } from "lodash";
import ProductSearchForPrint from "../components/ProductSearchForPrint";

function PrintSales() {
  const [camGranted, setCamGranted] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const ask = async () => {
      const perm =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;

      let status = await check(perm);
      if (status === RESULTS.DENIED || status === RESULTS.LIMITED) {
        status = await request(perm);
      }
      if (status === RESULTS.GRANTED) setCamGranted(true);
      else {
        Alert.alert(
          'Camera disabled',
          'Please enable camera permission in Settings to scan barcodes.',
        );
      }
    };
    ask();
  }, []);

  // request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN).then((result) => {
  //     console.log("accept");
  // });
  const [isScannerOpen, setScannerOpen] = useState(false); // State to handle scanner visibility
  const [currentBoxKey, setCurrentBoxKey] = useState(null); // Track the active box for scanning
  const handleBarcodeScanned = (scannedData) => {
    // console.log("Scanned Data:", scannedData); // Log scanned data for debugging

    setScannerOpen(false); // Close the scanner

    if (currentBoxKey) {
      // Update the state with the scanned barcode
      setBoxData((prev) => ({
        ...prev,
        [currentBoxKey]: {
          ...prev[currentBoxKey],
          barcode: scannedData, // Set the scanned data in the specific box
        },
      }));

      // Directly call the search function with the scannedData
      handleIndividualBarcodeSearch(currentBoxKey, scannedData);
    } else {
      Alert.alert("Error", "No box key selected for scanning.");
    }
  };

  const [printBox, setPrintBox] = useState({
    logo: "",
    number_of_prints: "1",
    number_of_boxes: "1",
    duplicate_boxes: false,
    highlightHeading: "",
    highlightHeading_style: {
      color: "black",
      fontStyle: "italic"
    }
  })
  const navigation = useNavigation();
  const numOfBoxes = [
    { box: '1' },
    { box: '2' },
    { box: '4' },
    { box: '6' },
    { box: '8' }
  ]

  const [imageBase64, setImageBase64] = useState();
  const [imageModal, setImagemodal] = useState(false);
  const [enteredText, setEnteredText] = useState("");
  const [IpAddress, setIpAddress] = useState('');
  const [selectedBox, setSelectedBox] = useState([]);
  const [boxData, setBoxData] = useState()
  const [isLoading, setLoading] = useState(false);
  const [typedBarcode, setTypedBarcode] = useState(""); // State for barcode input
  const [barcodeData, setBarcodeData] = useState(null); // State to store fetched data
  const [isLoadingBarcode, setLoadingBarcode] = useState(false);


  const [selectModelProduct, setSelectedModelProduct] = useState({})
  const [openModel, setOpenModel] = useState(false);
  const [manualWord, setManualWord] = useState('')

  const handleIndividualBarcodeSearch = async (boxKey, scannedData) => {
    const barcodeValue = boxData[boxKey]?.barcode || scannedData || ""; // Use scannedData as a fallback
    // console.log("Barcode Value for Search:", barcodeValue); // Debugging log

    if (!barcodeValue) {
      Alert.alert("Error", "Please enter a valid barcode to search.");
      return;
    }

    setLoadingBarcode(true);
    try {
      const [baseURL, token] = await Promise.all([
        AsyncStorage.getItem("storeUrl"),
        AsyncStorage.getItem("access_token"),
      ]);

      if (!baseURL || !token) {
        throw new Error("Base URL or token not found in AsyncStorage");
      }

      const myHeaders = new Headers();
      myHeaders.append("access_token", token);

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
        credentials: "omit",
      };

      const response = await fetch(
        `${baseURL}/api/searchbybarcode/products?barcode=${barcodeValue}`,
        requestOptions
      );

      const textResponse = await response.text();

      if (response.headers.get("Content-Type")?.includes("application/json")) {
        const result = JSON.parse(textResponse);
        // console.log("API Response:", result); // Debugging log

        if (result.items && result.items[0]) {
          const updatedBoxData = { ...boxData };
          updatedBoxData[boxKey].title_1 = result.items[0].name || "No Name";
          updatedBoxData[boxKey].price = result.items[0].list_price || "0.00";
          updatedBoxData[boxKey].quantity = result.items[0].size || "";
          updatedBoxData[boxKey].barcode = ""
          setBoxData(updatedBoxData);

        } else {
          setCurrentBoxKey(boxKey)
          // Alert.alert("Error", "No items found for this barcode.");
        }
      } else {
        Alert.alert("Error", "Unexpected response format.");
      }
    } catch (error) {
      console.error("Error fetching barcode data:", error.message);
      Alert.alert("Error", "Failed to fetch barcode data. Please try again.");
    } finally {
      setLoadingBarcode(false);
    }
  };

  useEffect(() => {
    const boxes = [];
    let boxesData = {};
    for (let i = 0; i < parseInt(printBox.number_of_boxes); i++) {
      boxes.push(i);
      boxesData[`box${i + 1}`] = {
        title_1: "",
        title_2: "",
        title_2_style: {
          color: "black",
          fontStyle: "italic"
        },
        price: "",
        quantity: "",
        title_1_style: {
          color: "black",
          fontStyle: "italic"
        },

        price_style: {
          color: "black",
          fontStyle: "italic"
        },
        quantity_style: {
          color: "black",
          fontStyle: "italic"
        }
      };
    }
    setSelectedBox(boxes);
    setBoxData(boxesData);
  }, [printBox.number_of_boxes]);


  const saveImageToStorage = async (imageData) => {
    try {
      await AsyncStorage.setItem('printBoxLogo', imageData);
    } catch (error) {
      console.error('Error saving image to AsyncStorage:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedImage = await AsyncStorage.getItem('printBoxLogo');
        if (savedImage) {
          setImageBase64(savedImage);
        }
      } catch (error) {
        console.error('Error loading image from AsyncStorage:', error);
      }
    };
    loadData();

  }, []);

  const handleImageChange = (image) => {
    let tempDecode = encodeURIComponent(image.data);
    setImageBase64(tempDecode);
    saveImageToStorage(tempDecode);
    setImagemodal(false);
  };

  const handleImageChangeFromCamera = () => {
    ImagePicker.clean()
      .then(() => {
        console.log('removed all tmp images from tmp directory');
      })
      .catch(e => {
        alert(e);
      });
    ImagePicker.openCamera({
      width: 300,
      height: 300,
      includeBase64: true,
      cropping: true,
      forceJpg: true,
      freeStyleCropEnabled: true,
      compressImageQuality: 0.8, // Compress image with quality (from 0 to 1, where 1 is best quality).
    }).then(handleImageChange).catch((error) => {
      console.log('error 2', error)
    })
  };

  const handleImageChangeFromGallary = () => {
    ImagePicker.openPicker({
      width: 300,
      height: 300, includeBase64: true,
      cropping: true,
      forceJpg: true,
      freeStyleCropEnabled: true,
      compressImageQuality: 0.8
    }).then(handleImageChange).catch((error) => {
      console.log('error 1', error)
    })
  }

  function isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  let TempIP_Address = 'http://192.168.1.12:5500/generate-pdf'

  const PrintProductsDetails = async () => {
    try {
      setLoading(true)
      const requestData = {
        ...printBox,
        logo: imageBase64, // Include the logo image
        box: Object.values(boxData)
      };
      fetch(`${TempIP_Address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
        .then(res => res.text())
        .then(res => {
          // console.log('responedata', res)
          let jasonText = isJsonString(res);
          if (jasonText) {
            res = JSON.parse(res);
            if (res?.operation == 'success') {
              alert(res?.operation);
              setLoading(false)
            } else {
              setLoading(false)
            }
          } else {
            setLoading(false)
            alert('something is wrong');
          }
        })
        .catch((err) => {
          console.log('respone', err)
          setLoading(false)
        })
    } catch (error) {
      console.log(error, 'error');
      setLoading(false)
      alert('something is wrong in api');
    }
  };

  const checkIP = async () => {
    try {

      const IP_Address = await AsyncStorage.getItem('IP_Address');
      if (enteredText) {
        TempIP_Address = enteredText;
      } else if (IP_Address) {
        TempIP_Address = IP_Address;
      } else {
        setLoading(false)
        alert('Please add IP');
        return;
      }
      PrintProductsDetails();
    } catch (error) {
      console.error('Error fetching IP address:', error);
      setLoading(false)
      alert('An error occurred while fetching the IP address');
    }
  }

  function handleChange(value, name, index, stylesName) {
    // console.log("handleChange : ", value, name, index, boxData, stylesName)
    if (stylesName) {
      setBoxData(prev => {
        return {
          ...prev,
          [`box${index}`]: {
            ...prev[`box${index}`],
            [name]: {
              ...prev[`box${index}`][name],
              [stylesName]: value
            }
          }
        }
      })
    } else {
      setBoxData(prev => {
        return {
          ...prev,
          [`box${index}`]: {
            ...prev[`box${index}`],
            [name]: value
          }
        }
      })
    }
  }




  useEffect(() => {
    if ((Object.keys(selectModelProduct)).length > 0 && currentBoxKey != null) {
      const updatedBoxData = { ...boxData };
      updatedBoxData[currentBoxKey].title_1 = selectModelProduct.name || 'No Name';
      updatedBoxData[currentBoxKey].price = selectModelProduct.list_price || '0.00';
      updatedBoxData[currentBoxKey].quantity = selectModelProduct.size || '';
      updatedBoxData[currentBoxKey].barcode = selectModelProduct.barcode || '';
      setBoxData(updatedBoxData);
    }
  }, [selectModelProduct])

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={{ backgroundColor: 'skyblue' }}>
        <View style={{ alignSelf: 'center', paddingTop: 10 }}>
          {/* Select image */}
          <View style={Styles.selectImageView}>
            <Image
              style={{
                width: Platform.OS === 'android' ? 150 : 160,
                height: Platform.OS === 'android' ? 150 : 160,
                borderRadius: 20,
              }}
              source={{ uri: `data:image/png;base64,${imageBase64}` }}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={Styles.editImageBtn}
              onPress={() => setImagemodal(true)}>
              <Image
                style={{ width: 30, height: 25 }}
                source={(uri = editImage)}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <Modal
            animationType="slide"
            transparent={false}
            visible={imageModal}>
            <View style={{ justifyContent: 'center' }}>
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 23,
                  color: '#000',
                  alignSelf: 'center',
                  marginTop: '50%',
                }}>
                CHOOSE & SELECT PHOTO
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-evenly',
                  marginTop: '10%',
                }}>
                <TouchableOpacity
                  onPress={() => {
                    handleImageChangeFromCamera();
                  }}
                  style={{
                    width: '40%',
                    aspectRatio: 1,
                    borderColor: '#d1e2ff',
                    borderWidth: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 20,
                    backgroundColor: '#d1e2ff',
                  }}>
                  <Text
                    style={{
                      textAlign: 'center',
                      fontSize: 18,
                      color: '#000',
                    }}>
                    CAMERA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    handleImageChangeFromGallary();
                  }}
                  style={{
                    width: '40%',
                    aspectRatio: 1,
                    borderColor: '#d9ffd1',
                    borderWidth: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 20,
                    backgroundColor: '#d9ffd1',
                  }}>
                  <Text
                    style={{
                      textAlign: 'center',
                      fontSize: 18,
                      color: '#000',
                    }}>
                    GALLERY
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setImagemodal(false);
                }}
                style={{
                  alignItems: 'center',
                  marginHorizontal: '20%',
                  marginVertical: '5%',
                  borderColor: '#fff',
                  borderWidth: 0.5,
                  padding: '2%',
                  borderRadius: 20,
                  backgroundColor: '#ffc4c4',
                }}>
                <Text
                  style={{
                    fontSize: 18,
                    color: '#ff0000',
                    fontWeight: '400',
                    padding: 8,
                  }}>
                  CANCEL
                </Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </View>

        <View style={Styles.addIPBtnView}>
          <TextInput
            style={Styles.addIPTextInput}
            defaultValue={IpAddress}
            onChangeText={e => {
              setIpAddress(e);
              // console.log(IpAddress, 'barcodetyped');
            }}
            placeholder="ADD IP"
            placeholderTextColor="black"
            autoCapitalize="none"
            textAlign="center"
          />

          {IpAddress.length ? (
            <TouchableOpacity
              onPress={async () => {
                setIpAddress('');
                // await AsyncStorage.setItem('IP_Address', IpAddress);
                await AsyncStorage.setItem(
                  'IP_Address',
                  IpAddress + '/generate-pdf',
                );
                alert('IP Saved');
              }}
              style={{
                backgroundColor: '#038c7f',
                padding: '3%',
                borderColor: '#adadad',
                borderRadius: 10,
                width: '25%',
                alignSelf: 'center',
              }}>
              <Text
                style={{ color: '#fff', textAlign: 'center', fontSize: 16 }}>
                SAVE IP
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (!IpAddress.length) {
                  alert('Please type IP Address.');
                }
              }}
              style={{
                backgroundColor: '#adadad',
                padding: '3%',
                borderRadius: 10,
                width: '25%',
                alignSelf: 'center',
              }}>
              <Text
                style={{ color: '#fff', textAlign: 'center', fontSize: 16 }}>
                SAVE IP
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 5,
          }}>
          <Text
            style={{
              color: 'black',
              padding: 10,
              fontSize: 14,
              fontWeight: '500',
            }}>
            SELECT NO.OF BOXES:
          </Text>
          <View style={Styles.numberOfBoxesView}>
            <SelectDropdown
              data={numOfBoxes}
              onSelect={selectedItem => {
                setPrintBox(prevState => ({
                  ...prevState,
                  number_of_boxes: selectedItem.box,
                  number_of_prints: '1',
                }));
              }}
              renderButton={() => {
                return (
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#151E26',
                        padding: 10,
                      }}>
                      {' '}
                      {printBox.number_of_boxes}{' '}
                    </Text>
                  </View>
                );
              }}
              renderItem={item => {
                return (
                  <View style={Styles.boxesSelectionView}>
                    <Text style={Styles.boxesSelectionText}>
                      {' '}
                      {item.box}{' '}
                    </Text>
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
              dropdownStyle={{ backgroundColor: '#E9ECEF', borderRadius: 8 }}
            />
          </View>
        </View>

        <View style={Styles.duplicateBoxesView}>
          <Text style={{ fontSize: 14, fontWeight: '500' }}>
            DUPLICATE BOXES:{' '}
          </Text>
          <CheckBox
            onClick={() => {
              if (printBox.number_of_boxes > 1) {
                setPrintBox(prev => {
                  return {
                    ...prev,
                    ['duplicate_boxes']: !prev.duplicate_boxes,
                  };
                });
              } else {
                alert(
                  'number of Boxes should be more than 1 for duplicate Boxes',
                );
              }
            }}
            checkBoxColor={'black'}
            checkedCheckBoxColor={'white'}
            isChecked={printBox.duplicate_boxes}
          />
        </View>
        {/* Existing PrintSales Components */}
        {/* highlightHeading start */}
        {selectedBox.map((box, index) =>
          printBox.duplicate_boxes && index > 0 ? null : (
            <View key={index} style={Styles.printSalesMainView}>
              <View style={Styles.barcodeSearchContainer}>
                <View style={Styles.inputContainer}>
                  <TextInput
                    style={Styles.barcodeInput}
                    value={boxData[`box${index + 1}`]?.barcode || ''}
                    onChangeText={text => {
                      setManualWord(text);
                      setBoxData(prev => ({
                        ...prev,
                        [`box${index + 1}`]: {
                          ...prev[`box${index + 1}`],
                          barcode: text,
                        },
                      }));
                    }}
                    placeholder="TYPE OR SCAN CODE"
                    placeholderTextColor="#888"
                  />
                  <TouchableOpacity
                    style={Styles.cameraIconContainer}
                    onPress={() => {
                      setBoxData(prev => ({
                        ...prev,
                        [`box${index + 1}`]: {
                          ...prev[`box${index + 1}`],
                          barcode: '',
                        },
                      }));
                      setCurrentBoxKey(`box${index + 1}`); // Set the current box key
                      setScannerOpen(true); // Open BARCODE Code Scanner
                    }}>
                    <Image
                      style={Styles.cameraImage}
                      source={require('../.././src/images/compact-camera.png')}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    handleIndividualBarcodeSearch(`box${index + 1}`)
                    setOpenModel(true);
                  }}
                  style={Styles.barcodeBtn}>
                  <Text style={Styles.barcodeBtnText}>
                    {isLoadingBarcode ? 'Loading...' : 'Search'}
                  </Text>
                </TouchableOpacity>
              </View>

              {printBox.number_of_boxes > 1 ? null : (
                <View
                  style={
                    printBox.number_of_boxes > 1
                      ? { ...Styles.highlightHeadingView_1, flex: 0 }
                      : { ...Styles.highlightHeadingView_1, flex: 1 }
                  }>
                  <EditImageModel
                    setPrintTextColor={value =>
                      setPrintBox({
                        ...printBox,
                        highlightHeading_style: {
                          ...printBox.highlightHeading_style,
                          color: value,
                        },
                      })
                    }
                    setSelectedFontStyle={value =>
                      setPrintBox({
                        ...printBox,
                        highlightHeading_style: {
                          ...printBox.highlightHeading_style,
                          fontStyle: value,
                        },
                      })
                    }
                  />
                  <TextInput
                    style={styles.PasswordTxtInput}
                    value={printBox.highlightHeading}
                    name="highlightHeading"
                    onChangeText={value =>
                      setPrintBox({ ...printBox, highlightHeading: value })
                    }
                    placeholder="PRODUCT HEADING"
                    placeholderTextColor="grey"
                    autoCapitalize={'characters'}
                    textAlign="center"
                  />
                </View>
              )}

              <View style={Styles.highlightHeadingView}>
                <EditImageModel
                  setPrintTextColor={value => {
                    handleChange(value, 'title_1_style', index + 1, 'color');
                  }}
                  setSelectedFontStyle={value => {
                    handleChange(
                      value,
                      'title_1_style',
                      index + 1,
                      'fontStyle',
                    );
                  }}
                />
                <TextInput
                  style={styles.PasswordTxtInput}
                  value={boxData[`box${index + 1}`]?.title_1} // Access the value from boxData
                  onChangeText={value =>
                    handleChange(value, 'title_1', index + 1)
                  } // Update boxData when the text changes
                  placeholder="PRODUCT TITLE"
                  placeholderTextColor="grey"
                  autoCapitalize="characters"
                  textAlign="center"
                />
              </View>

              {printBox.number_of_boxes > 1 ? null : (
                <View style={Styles.highlightHeadingView_1}>
                  <EditImageModel
                    setPrintTextColor={value => {
                      handleChange(
                        value,
                        'title_2_style',
                        index + 1,
                        'color',
                      );
                    }}
                    setSelectedFontStyle={value => {
                      handleChange(
                        value,
                        'title_2_style',
                        index + 1,
                        'fontStyle',
                      );
                    }}
                  />
                  <TextInput
                    style={styles.PasswordTxtInput}
                    value={boxData[`box${index + 1}`]?.title_2} // Access the value from boxData
                    onChangeText={value =>
                      handleChange(value, 'title_2', index + 1)
                    } // Update boxData when the text changes
                    placeholder="PRODUCT TITLE2"
                    placeholderTextColor="grey"
                    autoCapitalize="characters"
                    textAlign="center"
                  />
                </View>
              )}
              <View style={Styles.highlightHeadingView}>
                <EditImageModel
                  setPrintTextColor={value => {
                    handleChange(value, 'price_style', index + 1, 'color');
                  }}
                  setSelectedFontStyle={value => {
                    handleChange(
                      value,
                      'price_style',
                      index + 1,
                      'fontStyle',
                    );
                  }}
                />
                <TextInput
                  style={styles.PasswordTxtInput}
                  value={`${boxData[`box${index + 1}`]?.price || ''}`} // Explicitly convert to string
                  onChangeText={value =>
                    handleChange(value, 'price', index + 1)
                  }
                  placeholder="PRICE"
                  placeholderTextColor="grey"
                  autoCapitalize="none"
                  textAlign="center"
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>

              <View style={Styles.highlightHeadingView}>
                <EditImageModel
                  setPrintTextColor={value => {
                    handleChange(value, 'quantity_style', index + 1, 'color');
                  }}
                  setSelectedFontStyle={value => {
                    handleChange(
                      value,
                      'quantity_style',
                      index + 1,
                      'fontStyle',
                    );
                  }}
                />
                <TextInput
                  style={styles.PasswordTxtInput}
                  value={boxData[`box${index + 1}`]?.quantity || ''}
                  onChangeText={value =>
                    handleChange(value, 'quantity', index + 1)
                  }
                  placeholder="SIZE"
                  placeholderTextColor="grey"
                  autoCapitalize={'characters'}
                  textAlign="center"
                />
              </View>
            </View>
          ),
        )}

        <TextInput
          style={styles.PasswordTxtInput}
          value={printBox.number_of_prints}
          onChangeText={value =>
            setPrintBox(prevState => ({
              ...prevState,
              number_of_prints: value,
            }))
          }
          placeholder="NO.OF PRINTS"
          placeholderTextColor="grey"
          autoCapitalize="none"
          textAlign="center"
          keyboardType="numeric"
        />

        {isLoading ? (
          <View style={Styles.PrintActivityIndicator}>
            <ActivityIndicator
              style={{ width: '100%', marginTop: '15%' }}
              size="large"
              color="#228B22"
            />
            <Text style={Styles.LoadingBtnText}>LOADING...</Text>
          </View>
        ) : (
          <TouchableOpacity style={Styles.printBtn} onPress={() => checkIP()}>
            <Text style={Styles.printBtnText}>PRINT</Text>
          </TouchableOpacity>
        )}
      
        {isScannerOpen && camGranted && (
          <Modal transparent animationType="slide" visible onRequestClose={() => setScannerOpen(false)}>
            <View style={Styles.blurBackground}>
              <Camera
                style={{ flex: 1 }}
                cameraType={CameraType.Back}
                scanBarcode
                onReadCode={e => {
                    const value = e.nativeEvent.codeStringValue;
      const codeType = e.nativeEvent.codeType;
      console.log('value', value, 'type', codeType);
  
      // 1️⃣ If type says QR → skip
      if (codeType === 'QR_CODE') return;
      if (!codeType && /^(https?:\/\/|www\.)/i.test(value)) return;
                  handleBarcodeScanned(value);
                }}
                showFrame={false}           /* we draw our own corners, if you like */
                // flashMode={torchOn ? FlashMode.On : FlashMode.Off}
              />

              <TouchableOpacity
                onPress={() => setScannerOpen(false)}
                style={{
                  alignSelf: 'center', margin: 20, backgroundColor: '#060dcf',
                  padding: 12, borderRadius: 8
                }}>
                <Text style={{ color: '#fff', fontSize: 22 }}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}



      </ScrollView>
      {openModel && (
        <ProductSearchForPrint
          openModel={openModel}
          setOpenModel={setOpenModel}
          manualWord={manualWord}
          setManualWord={setManualWord}
          setSelectedModelProduct={setSelectedModelProduct}
        />
      )}
    </KeyboardAvoidingView>
  );
}

export default PrintSales;

const Styles = StyleSheet.create({
  printSalesMainView: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    width: '95%',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 10,
    borderColor: 'black',
    borderWidth: 0.5,
    paddingBottom: 10,
    marginBottom: 15
  },
  editImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 5,
  },
  highlightHeadingView: {
    borderColor: 'white',
    padding: '2%',
    borderWidth: 0.5,
    borderRadius: 8,
    width: '90%',
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#038c7f'
  },
  highlightHeadingView_1: {
    borderColor: 'white',
    padding: '2%',
    borderWidth: 0.5,
    borderRadius: 8,
    width: '90%',
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#038c7f'
  },
  printBtn: {
    backgroundColor: 'white',
    alignSelf: 'center',
    width: '70%',
    padding: '5%',
    marginVertical: '2%',
    borderRadius: 50,
    marginTop: 15,
    borderWidth: 0.5,
    marginBottom: '25%'
  },
  printBtnText: {
    textAlign: 'center',
    fontSize: 21,
    fontWeight: 'bold'
  },
  addIPBtnView: {
    flexDirection: 'row',
    width: '90%',
    alignSelf: 'center',
    marginTop: 5,
    justifyContent: 'space-evenly'
  },
  addIPTextInput: {
    backgroundColor: 'white',
    alignSelf: 'center',
    width: '60%',
    padding: '3%',
    marginVertical: '2%',
    fontSize: 16,
    borderRadius: 10,
  },
  numberOfBoxesView: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'grey',
    width: '40%',
    alignSelf: 'center',
  },
  boxesSelectionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#151E26'
  },
  boxesSelectionView: {
    width: '100%',
    borderBottomColor: 'grey',
    borderBottomWidth: 0.3,
    flexDirection: 'row',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  selectImageView: {
    marginTop: 5,
    width: '40%',
    flexDirection: 'row',
    borderColor: 'black',
    borderWidth: 0.5,
    borderRadius: 20,
    backgroundColor: 'white'
  },
  PrintActivityIndicator: {
    backgroundColor: 'skyblue',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '0%',
  },
  LoadingBtnText: {
    color: '#228B22',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: '20%'
  },
  duplicateBoxesView: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    padding: '1%'
  },
  barcodeSearchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
    marginRight: 10,
  },
  barcodeInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingRight: 40, // Add right padding to make room for the icon
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }], // Center the icon vertically
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraImage: {
    width: 24,
    height: 24,
    tintColor: 'grey',
  },
  barcodeBtn: {
    height: 45,
    paddingHorizontal: 15,
    backgroundColor: '#038c7f',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  barcodeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Semi-transparent overlay
    backdropFilter: 'blur(10px)', // CSS for blur effect
  },
})
