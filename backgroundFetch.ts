import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
const FETCH_TASK = 'background-fetch';

TaskManager.defineTask(FETCH_TASK, async () => {
    await getTextNotification();
});

export async function getTextNotification(){
    try {
        const user_id = await AsyncStorage.getItem('@user');
        const text_message = await AsyncStorage.getItem('@message');
      
        if (user_id) {
          const response = await fetch(`https://api.jadde.com.br/api/notifications-token/${user_id}`);
          const data = await response.json();
          if ((data?.text && data?.text !== text_message) || !text_message) {
            await AsyncStorage.setItem('@message', data?.text);
            await schedulePushNotification(data?.text);
          }
        }
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        console.log('Erro ao consumir a API: ', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
}

async function schedulePushNotification(message) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Agendamento realizado',
      body: message,
      data: { data: 'goes here', test: { test1: 'more data' } },
    },
    trigger: { seconds: 1 },
  });
}

export async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(FETCH_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });
}

export async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(FETCH_TASK);
}
