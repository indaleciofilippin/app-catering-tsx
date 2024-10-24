import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, SafeAreaView, Alert, TouchableOpacity, StyleSheet, Modal, Switch, Animated, Platform, TextInput, TouchableWithoutFeedback
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFilteredCheckins, getAllCheckins } from '../storage/db/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';


interface User {
    personal_id: number;
    cuil: string;
    nombre: string;
    apellido: string;
    idservicio: number;
    fingreso: string;
}

export default function CheckinsScreen() {
    const [checkins, setCheckins] = useState<User[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedService, setSelectedService] = useState<number | undefined>(undefined);
    const [showDatePicker, setShowDatePicker] = useState(true);
    const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
    const [serviceFilterEnabled, setServiceFilterEnabled] = useState(false);
    const [nameOrCuilEnabled, setNameOrCuilEnabled] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-500)).current;  // Valor inicial fuera de la pantalla
    const [inputText, setInputText] = useState<string>('');
    const navigation = useNavigation();

    useEffect(() => {
        fetchAllCheckins();
    }, []);

    const fetchAllCheckins = async () => {
        try {
            const data = await getAllCheckins();
            setCheckins(data);
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los registros.');
        }
    };

    const applyFilters = async () => {
        try {
            const formattedDate = dateFilterEnabled && selectedDate
                ? selectedDate.toISOString().split('T')[0]
                : undefined;
            const service = serviceFilterEnabled ? selectedService : undefined;
            const nameOrCuil = nameOrCuilEnabled ? inputText : undefined;

            const data = await getFilteredCheckins(formattedDate, service, nameOrCuil); // Aquí pasamos el nuevo filtro
            setCheckins(data);
            closeModal(); // Cerrar el modal al aplicar filtros
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los registros filtrados.');
        }
    };

    const clearFilters = () => {
        setSelectedDate(undefined);
        setSelectedService(undefined);
        setInputText('');
        setDateFilterEnabled(false);
        setServiceFilterEnabled(false);
        setNameOrCuilEnabled(false);
        setSelectedService(0);
        fetchAllCheckins();
    };

    const openModal = () => {
        setIsModalVisible(true);
        Animated.timing(slideAnim, {
            toValue: 0, // Moverlo al centro de la pantalla
            duration: 500,
            useNativeDriver: true,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, {
            toValue: -500, // Deslizarlo de vuelta hacia arriba
            duration: 500,
            useNativeDriver: true,
        }).start(() => setIsModalVisible(false));
    };

    const capitalizeFirstLetter = (text: string) => {
        return text
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View className='flex-row items-center justify-between px-4'>
                    <View className='flex p-1 w-8 h-8 bg-white items-center justify-center rounded-full'>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon name="arrow-back" size={22} color="#3496ff" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={openModal}
                        className='bg-sky-600'
                    >
                        <Text style={styles.filterButtonText}>Filtrar</Text>
                    </TouchableOpacity>
                </View>

                {isModalVisible && (
                    <Modal
                        transparent={true}
                        visible={isModalVisible}
                        onRequestClose={closeModal}
                    >
                        {/* Cerrar modal cuando se hace clic fuera del modal */}
                        <TouchableWithoutFeedback onPress={closeModal}>
                            <View style={styles.modalContainer}>
                                {/* Para que el clic dentro del contenido del modal no cierre el modal */}
                                <TouchableWithoutFeedback onPress={() => { }}>
                                    <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
                                        <View style={styles.modalViewTitle}>
                                            <Text style={styles.modalTitle}>Filtros</Text>
                                        </View>

                                        <View style={styles.filterRow}>
                                            <Switch
                                                trackColor={{ false: '#767577', true: '#00d200' }}
                                                thumbColor={dateFilterEnabled ? '#ffffff' : '#ffffff'}
                                                ios_backgroundColor="#bebebe"
                                                value={dateFilterEnabled}
                                                onValueChange={(value) => setDateFilterEnabled(value)}
                                            />
                                            <Text className='font-bold pl-3 text-white text-base'>
                                                Seleccionar fecha:
                                            </Text>

                                            {Platform.OS === 'android' ? (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={() => setShowDatePicker(true)}
                                                        style={styles.dateButton}
                                                    >
                                                        <Text style={styles.buttonText}>
                                                            {selectedDate
                                                                ? selectedDate.toLocaleDateString('es-ES', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                })
                                                                : 'Seleccionar fecha'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {showDatePicker && dateFilterEnabled && (
                                                        <DateTimePicker
                                                            value={selectedDate || new Date()}
                                                            mode="date"
                                                            display="default"
                                                            onChange={(event, date) => {
                                                                setShowDatePicker(false);
                                                                if (date) setSelectedDate(date);
                                                            }}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {showDatePicker && dateFilterEnabled && (
                                                        <DateTimePicker
                                                            value={selectedDate || new Date()}
                                                            mode="date"
                                                            accentColor='#ffc05b'
                                                            themeVariant="dark"
                                                            display='calendar'
                                                            onChange={(event, date) => {
                                                                if (date) setSelectedDate(date);
                                                            }}
                                                            style={{ borderRadius: 5 }}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </View>

                                        <View style={styles.filterRow}>
                                            <Switch
                                                trackColor={{ false: '#767577', true: '#00d200' }}
                                                thumbColor={dateFilterEnabled ? '#ffffff' : '#ffffff'}
                                                ios_backgroundColor="#bebebe"
                                                className='mr-3'
                                                value={serviceFilterEnabled}
                                                onValueChange={(value) => setServiceFilterEnabled(value)}
                                            />
                                            <View className='flex-1'>
                                                {Platform.OS === 'android' ? (
                                                    <View style={styles.fechaAndroid}>
                                                        <Picker
                                                            style={styles.picker}
                                                            selectedValue={selectedService}
                                                            onValueChange={(itemValue) => setSelectedService(itemValue)}
                                                            enabled={serviceFilterEnabled} // Habilitar o deshabilitar según el switch
                                                        >
                                                            <Picker.Item label="Seleccione un servicio" value={null} />
                                                            <Picker.Item label="Desayuno" value={1} />
                                                            <Picker.Item label="Almuerzo" value={2} />
                                                            <Picker.Item label="Merienda" value={3} />
                                                            <Picker.Item label="Cena" value={4} />
                                                        </Picker>
                                                    </View>
                                                ) : (
                                                    <Picker
                                                        selectedValue={selectedService}
                                                        onValueChange={(itemValue) => setSelectedService(itemValue)}
                                                        enabled={serviceFilterEnabled} // Habilitar o deshabilitar según el switch
                                                    >
                                                        <Picker.Item label="Seleccione un servicio" value={null} />
                                                        <Picker.Item label="Desayuno" value={1} />
                                                        <Picker.Item label="Almuerzo" value={2} />
                                                        <Picker.Item label="Merienda" value={3} />
                                                        <Picker.Item label="Cena" value={4} />
                                                    </Picker>
                                                )}
                                            </View>
                                        </View>

                                        <View style={styles.filterRow}>
                                            <Switch
                                                trackColor={{ false: '#767577', true: '#00d200' }}
                                                thumbColor={dateFilterEnabled ? '#ffffff' : '#ffffff'}
                                                ios_backgroundColor="#bebebe"
                                                className='mr-3'
                                                value={nameOrCuilEnabled}
                                                onValueChange={(value) => setNameOrCuilEnabled(value)}
                                            />
                                            <View className="bg-white rounded-lg justify-center text-base flex-1">
                                                <TextInput
                                                    style={styles.inputUser}
                                                    placeholder="Cuil o nombre de personal"
                                                    placeholderTextColor={'#c9c9c9'}
                                                    selectionColor={'#000000'}
                                                    value={inputText} // Aquí asignamos el valor del estado
                                                    onChangeText={(text) => setInputText(text)} // Aquí capturamos los cambios del input
                                                    editable={nameOrCuilEnabled}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.modalButtonsContainer}>
                                            <TouchableOpacity
                                                style={[styles.button, styles.clearButton]}
                                                onPress={clearFilters}
                                            >
                                                <Text style={styles.buttonText}>Limpiar Filtros</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.button, styles.applyButton]}
                                                onPress={applyFilters}
                                            >
                                                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </Animated.View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                )}

                {checkins.length > 0 ? (
                    <FlatList
                        data={checkins}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => {
                            // Formatear la fecha a día/mes/año
                            const [year, month, day] = item.fingreso.split('-');
                            const formattedDate = `${day}/${month}/${year}`;


                            // Asignar el nombre del servicio según el id
                            const serviceNames: { [key: number]: string } = {
                                1: 'Desayuno',
                                2: 'Almuerzo',
                                3: 'Merienda',
                                4: 'Cena'
                            };
                            const serviceName = serviceNames[item.idservicio] || 'Desconocido';

                            return (
                                <View style={styles.itemContainer} className='mx-4'>
                                    <View className='flex-row items-center justify-between mb-2'>
                                        <Text style={styles.itemCuil}>
                                            {item.cuil}
                                        </Text>

                                        <View className='flex-row items-center justify-center p-2 shadow-lg bg-white rounded-full'>
                                            <Text style={styles.itemDate}>
                                                {formattedDate}
                                            </Text>
                                            <Text style={styles.itemService}>
                                                {serviceName}
                                            </Text>
                                        </View>


                                    </View>
                                    <Text style={styles.itemName}>
                                        {capitalizeFirstLetter(item.nombre)} {capitalizeFirstLetter(item.apellido)}
                                    </Text>
                                </View>
                            );
                        }}
                    />
                ) : (
                    <Text style={styles.noRecordsText}>No se encontraron registros.</Text>
                )}
            </View>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    fechaAndroid: {
        padding: 5,
        alignContent: 'center',
        borderRadius: 10,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
    },
    picker: {
        height: 45,
        color: '#6b6b6b',
    },
    container: {
        flex: 1,
        paddingTop: 45,
        backgroundColor: '#f5f5f5',
    },
    content: {
    },
    filterButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        right: 0,
        marginBottom: 10,
        alignItems: 'center',
    },
    filterButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        marginTop: -30,
        flex: 1,
        justifyContent: 'flex-start',  // Iniciar desde arriba
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '100%', // Ocupa un poco más de la mitad de la pantalla
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'flex-start',
        position: 'absolute',
        top: 0,  // Se despliega desde la parte superior
    },
    modalViewTitle: {
        display: 'flex',
        width: '100%',
        marginTop: 50,
        marginBottom: 10,
        height: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 10,
        height: 70,
        width: '100%',
        backgroundColor: '#3496ff',
        borderRadius: 20,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    button: {
        padding: 15,
        borderRadius: 20,
        alignContent: 'center',
        justifyContent: 'center',
    },
    dateButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        backgroundColor: '#fffd',
        borderRadius: 7,
        padding: 3,
        marginLeft: 10,
    },
    disabledText: {
        color: '#999',
    },
    modalButtonsContainer: {
        display: 'flex',
        flexDirection: 'row',
        width: "100%",
        justifyContent: 'space-around',
        marginTop: 20,
    },
    applyButton: {
        backgroundColor: '#3e9fff',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        color: '#9a9a9a',
        fontWeight: 'bold',
        fontSize: 14,
    },
    clearButton: {
        backgroundColor: '#ffffff',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#c1c1c1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        color: '#9a9a9a',
        fontWeight: 'bold',
        fontSize: 14,
    },
    closeButton: {
        backgroundColor: '#607D8B',
    },
    buttonText: {
        color: '#9a9a9a',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e6e6e6',
    },
    itemCuil: {
        fontSize: 14,
        color: '#666',
    },
    itemDate: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#7c0000',
        marginRight: 8,
    },
    itemService: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#c65200',
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    noRecordsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
    inputUser: {
        width: "100%",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderColor: '#ffffff',
        borderRadius: 8,
        fontSize: 16,
        color: '#6b6b6b',
        backgroundColor: '#ffffff',
        shadowColor: '#535353',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
});
