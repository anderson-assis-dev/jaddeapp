import AsyncStorage from '@react-native-async-storage/async-storage';

export async function userId() {
    try {
      const id = await AsyncStorage.getItem('@user');
      if (id) {
        return id;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao recuperar ID do usuário:', error);
      return null; // Em caso de erro, retorna null
    }
  }
  export async function textMessage() {
    try {
      const message = await AsyncStorage.getItem('@message');
      if (message) {
        return message;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao recuperar textMessage:', error);
      return null; // Em caso de erro, retorna null
    }
  }