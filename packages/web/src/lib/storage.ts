import localforage from "localforage";

// Configure localforage
localforage.config({
  name: "secret-santa",
  storeName: "app_data",
});

export const storage = {
  async getItem<T = string>(key: string): Promise<T | null> {
    return localforage.getItem<T>(key);
  },

  async setItem<T>(key: string, value: T): Promise<T> {
    return localforage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    return localforage.removeItem(key);
  },
};
