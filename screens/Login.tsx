import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import useAuth from '../hooks/useAuth';
import { RootStackParamList } from '../App';

export default function Login() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const { login } = useAuth();

    const [usuario, setUsername] = useState('');
    const [password, setPassword] = useState('');


    const handleLogin = async () => {
        try {
            const success = await login({ usuario, password });

            if (success) {
                navigation.navigate('HomeScreen');
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            Alert.alert('Error', 'Ha ocurrido un error durante el inicio de sesión.');
        }
    };

    return (
        <View className="h-full w-full">
            <StatusBar style="dark" />
            <SafeAreaView className="h-full w-full">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View className="h-full w-full justify-center pb-16">
                        <View className="flex items-center mx-4 space-y-6">
                            <View className="flex items-center">
                                <View className="h-[200] w-full items-center">
                                    <Animated.Image entering={FadeInUp.delay(400).duration(2000).springify()} className="h-[170] w-[150]" source={require('../assets/images/Josemaria_logo.png')} />
                                </View>
                                <Animated.Text entering={FadeInUp.duration(2000).springify()} className="text-sky-600 font-bold tracking-wider text-5xl shadow-md">
                                    Bienvenido
                                </Animated.Text>
                            </View>
                            <Animated.View entering={FadeInDown.delay(400).duration(3000).springify()} className="bg-black/5 p-5 rounded-2xl w-full font-semibold">
                                <TextInput
                                    className="font-semibold text-black"
                                    placeholder="Email"
                                    placeholderTextColor={'#858585'}
                                    selectionColor={'#000000'}
                                    value={usuario}
                                    onChangeText={setUsername}
                                    autoCapitalize="none" // Agregado para evitar autocapitalización
                                    autoCorrect={false} // Desactiva autocorrección
                                    keyboardType="email-address" // Mejor tipo de teclado para email
                                />
                            </Animated.View>
                            <Animated.View entering={FadeInDown.delay(600).duration(3000).springify()} className="bg-black/5 p-5 rounded-2xl w-full">
                                <TextInput
                                    className="font-semibold text-black"
                                    placeholder="Contraseña"
                                    placeholderTextColor={'#858585'}
                                    secureTextEntry
                                    selectionColor={'#000000'}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </Animated.View>
                            <Animated.View entering={FadeInDown.delay(800).duration(3000).springify()} className="w-full">
                                <TouchableOpacity onPress={handleLogin} className="w-full bg-white p-3 rounded-2xl mb-16 shadow-md">
                                    <Text className="text-xl font-bold text-sky-500 text-center">
                                        Login
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
            <View className="h-200 w-full bottom-0 flex justify-end" style={styles.bottomImage}>
                <Animated.Image entering={FadeInDown.duration(2000)} className="h-[200] w-full absolute shadow-md" source={require('../assets/images/bottom-montanias-1.png')} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomImage: {
        zIndex: -1,
    },
});
