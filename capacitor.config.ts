import type { CapacitorConfig } from "@capacitor/cli";

// Native Android / iOS shells around the web app (built into dist/).
const config: CapacitorConfig = {
  appId: "com.enklaw.casediary",
  appName: "EnkLaw",
  webDir: "dist",
  backgroundColor: "#13203a",
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#13203a",
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: "#b7862b",
    },
  },
};

export default config;
