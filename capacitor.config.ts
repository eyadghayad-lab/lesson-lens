import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lessonlens.app',
  appName: 'LessonLens',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
