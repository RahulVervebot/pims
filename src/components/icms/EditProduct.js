import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Button,
  Animated,
  TextInput,
  Easing,
  TouchableWithoutFeedback
} from 'react-native';

function EditProduct({ visible, item, onClose, onSave }) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!item) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose} // Android back button
    >
      {/* Backdrop touchable */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          {/* Stop touches inside modal from closing */}
          <TouchableWithoutFeedback>
            <Animated.View
              style={{
                backgroundColor: '#fff',
                padding: 16,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>
                Edit Product
              </Text>

              <TextInput
                value={item.description}
                onChangeText={(text) => onSave({ ...item, description: text }, false)}
                placeholder="Description"
                style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
              />

              <TextInput
                value={String(item.unitPrice)}
                keyboardType="numeric"
                onChangeText={(text) =>
                  onSave({ ...item, unitPrice: parseFloat(text) || 0 }, false)
                }
                placeholder="Unit Price"
                style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
              />

              <Button title="Save" onPress={() => onSave(item, true)} />
              <View style={{ height: 8 }} />
              <Button title="Cancel" onPress={onClose} color="red" />
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default React.memo(EditProduct);
