import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import WebView from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { textMessage, userId } from './AsyncStorage';
import { registerBackgroundFetchAsync, unregisterBackgroundFetchAsync, getTextNotification } from './backgroundFetch';

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
      Notifications.getNotificationChannelsAsync().then((value: any) => setChannels(value ?? []));
    }
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log("aqui", response);
    });

    registerBackgroundFetchAsync();

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
      unregisterBackgroundFetchAsync();
    };
  }, []);

  async function handleMessage(event: any) {
    const messageData = JSON.parse(event.nativeEvent.data);
    console.log("event", messageData.type)
    switch (messageData.type) {
      case 'loginSuccess':
        const user_id: string = messageData?.data?.id.toString();
        AsyncStorage.setItem('@user', user_id);
        break;
      case 'logoutSuccess':
        AsyncStorage.setItem('@user', "");
        setUser(undefined);
        break;
      case 'scheduleStore':
        const regex = /(\d+)\s+(\d+)$/;
        const match = messageData.data.match(regex);
        const admin_id = match[1];
        const colaborator = match[2];
        const newText = messageData.data.replace(regex, '').trim();
        const logado_id = await AsyncStorage.getItem('@user');
        if(logado_id == colaborator || logado_id == admin_id){
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Agendamento realizado',
              body: newText,
              data: { data: 'goes here', test: { test1: 'more data' } },
            },
            trigger: { seconds: 1 },
          });
        }
    
        break;
      default:
        break;
    }
  }

  return (
    <WebView
      source={{ uri: 'https://app.jadde.com.br/' }}
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
