import { useState, useEffect, useRef } from 'react';
import {  Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import WebView from 'react-native-webview';
import { User } from './User.interface';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
    const [message, setMessage] = useState<null | undefined>(null);
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>([]);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

    if (Platform.OS === 'android') {
      Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
    }
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("aqui");
    });

    const interval = setInterval(() => {
      if(user){
        fetchAndScheduleNotification();
      }
     
    
    }, 3000); //30000
    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
      clearInterval(interval);
    };
  }, []);
  const fetchAndScheduleNotification = async () => {
    try {
      const data_user: any = await AsyncStorage.getItem('@user');
      setUser(data_user)
      if(user){
        const response = await fetch(`https://api.jadde.com.br/api/notifications-token/${user?.id}`);
        const data = await response.json();
      
        console.log("data", data?.text)
        console.log("message", message)
        if(data?.text && data?.text !== message){
          console.log("data22", data)
          console.log("message222", message)
          setMessage(data?.text)
          await schedulePushNotification();
        }
      }  
   
    } catch (error) {
      console.error("Erro ao consumir a API: ", error);
    }
  };
  async function schedulePushNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Agendamento realizado",
        body: message,
        data: { data: 'goes here', test: { test1: 'more data' } },
      },
      trigger: { seconds: 1 },
    });
  }
  async function handleMessage(event: any) {

    const messageData = JSON.parse(event.nativeEvent.data);
  
    switch (messageData.type) {
  
      case 'loginSuccess':
          setUser(messageData.data);
          AsyncStorage.setItem('@user', messageData.data);
          console.log('Login success:', messageData.data);
        break;
      case 'logoutSuccess':
          setUser(null);
          console.log(user)
        break; 
  
      case 'scheduleStore':
          console.log('Schedule store success:', messageData.data);
        break; 
      default:
        break;
    }
  }
  return (
    <WebView
      source={{ uri: 'https://chat.jadde.com.br/' }}
      style={{ flex: 1 }}
      onMessage={handleMessage}
    />
  );
}



async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
