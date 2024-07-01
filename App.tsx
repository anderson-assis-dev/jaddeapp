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
  const [user, setUser] = useState<string | undefined>(undefined);
    const [message, setMessage] = useState<null | undefined | string>(null);
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
      fetchAndScheduleNotification();
    }, 20000); //30000
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
      const user_id: any = await userId();
      const text_message: any = await textMessage();
      if(user || user_id){
        const response = await fetch(`https://api.jadde.com.br/api/notifications-token/${user || user_id}`);
        const data = await response.json();
        if((data?.text && data?.text !== text_message) || text_message == null){
          AsyncStorage.setItem('@message', data?.text);
          await schedulePushNotification(data?.text);
        }
      }  
   
    } catch (error) {
      console.log("Erro ao consumir a API: ", error);
    }
  };
  async function userId() {
    try {
      const id = await AsyncStorage.getItem('@user');
      if (id) {
        setUser(id);
        return id;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao recuperar ID do usuário:', error);
      return null; // Em caso de erro, retorna null
    }
  }
  async function textMessage() {
    try {
      const message = await AsyncStorage.getItem('@message');
      if (message) {
        console.log("store", message);
        setMessage(message);
        return message;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao recuperar textMessage:', error);
      return null; // Em caso de erro, retorna null
    }
  }
  async function schedulePushNotification(message: string) {
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
        const user_id: string = messageData?.data?.id.toString();
          AsyncStorage.setItem('@user', user_id);
        break;
      case 'logoutSuccess':
          AsyncStorage.setItem('@user',"");
          setUser(undefined)

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
