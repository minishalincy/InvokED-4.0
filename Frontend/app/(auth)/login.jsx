import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/authContext";
import axios from "axios";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_MY_API_URL;
const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID;

const Login = () => {
  const router = useRouter();
  const { login, role } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  console.log("user", role);

  const handleChange = (name) => (value) => {
    setError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("All fields are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      if (role === "teacher") {
        const response = await axios.post(
          `${API_URL}/api/teacher/login`,
          formData
        );
        const { user, token } = response.data;
        await login(user, token);
        router.replace("teacher/(tabs)/home");
      } else if (role === "parent") {
        const response = await axios.post(
          `${API_URL}/api/parent/login`,
          formData
        );
        const { user, token } = response.data;
        await login(user, token);

        // Register for push notifications after successful parent login
        try {
          await registerForPushNotifications();
        } catch (pushError) {
          console.error("Push notification registration error:", pushError);
          // Continue with login flow even if push registration fails
        }

        router.replace("parent/(tabs)/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to register for push notifications
  const registerForPushNotifications = async () => {
    try {
      // Check for existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // If not already granted, request permission
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If permission not granted, exit
      if (finalStatus !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });

      console.log("Push token obtained on login:", tokenData.data);

      // Store token in AsyncStorage
      await AsyncStorage.setItem("expoPushToken", tokenData.data);

      // Send token to server
      await axios.put(`${API_URL}/api/parent/push-token`, {
        pushToken: tokenData.data,
      });
    } catch (error) {
      console.error(
        "Error registering for push notifications during login:",
        error
      );
      throw error;
    }
  };
  const handleRegisterPress = () => {
    if (role === "teacher") {
      router.push("/registerTeacher");
    } else if (role === "parent") {
      router.push("/registerParent");
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View className="items-center w-full">
          <Image
            source={require("../../assets/images/logo.jpg")}
            className="w-50 h-25 mb-5"
            style={{ width: 280, height: 280 }}
          />

          <Text className="text-3xl font-bold text-blue-600 mb-5">Login</Text>

          <View className="w-full mb-4">
            <Text className="text-base font-medium mb-1">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2.5 text-base w-full"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.email}
              onChangeText={handleChange("email")}
              editable={!isLoading}
            />
          </View>

          <View className="w-full mb-4">
            <Text className="text-base font-medium mb-1">Password</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2.5 text-base w-full"
              placeholder="Enter your password"
              secureTextEntry
              value={formData.password}
              onChangeText={handleChange("password")}
              editable={!isLoading}
            />
          </View>

          {error ? (
            <Text className="text-red-500 mb-2.5 text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            className={`bg-blue-600 py-3 px-5 rounded-md w-full items-center ${
              isLoading ? "opacity-70" : ""
            }`}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-bold">Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRegisterPress}
            className="mt-5"
            disabled={isLoading}
          >
            <Text className="text-base text-gray-600">
              Don't have an account?{" "}
              <Text className="text-blue-600 font-bold">Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;
