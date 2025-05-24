import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolidCDA - Community Management Platform",
  description: "Manage your Community Development Association effectively.",
};

import Layout from "@/components/Layout"; // Using import alias
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider
import { ThemeProvider, useTheme } from "@/context/ThemeContext"; // Import ThemeProvider and useTheme
import { Toaster, toast } from 'react-hot-toast'; // Import Toaster and toast for types if needed
import type { ToastOptions, DefaultToastOptions } from 'react-hot-toast';

// New AppContent component to use client hooks
function AppContent({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const toastOptionsConfig: DefaultToastOptions = {
    duration: 5000,
    style: {
      background: resolvedTheme === 'dark' ? '#262626' : '#ffffff', // neutral-800 vs white
      color: resolvedTheme === 'dark' ? '#e5e5e5' : '#171717', // neutral-200 vs neutral-900
      border: `1px solid ${resolvedTheme === 'dark' ? '#404040' : '#e5e5e5'}`, // neutral-700 vs neutral-200
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // shadow-lg
    },
    success: {
      duration: 3000,
      iconTheme: {
        primary: '#10b981', // emerald-500 (our secondary)
        secondary: resolvedTheme === 'dark' ? '#262626' : '#ffffff',
      },
      style: {
        background: resolvedTheme === 'dark' ? '#052e16' : '#f0fdf4', // Adjust success bg for dark/light
        color: resolvedTheme === 'dark' ? '#6ee7b7' : '#065f46',     // Adjust success text for dark/light
        border: `1px solid ${resolvedTheme === 'dark' ? '#059669' : '#a7f3d0'}`
      }
    },
    error: {
      iconTheme: {
        primary: '#ef4444', // red-500
        secondary: resolvedTheme === 'dark' ? '#262626' : '#ffffff',
      },
      style: {
        background: resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2', // Adjust error bg for dark/light
        color: resolvedTheme === 'dark' ? '#fca5a5' : '#991b1b',     // Adjust error text for dark/light
        border: `1px solid ${resolvedTheme === 'dark' ? '#dc2626' : '#fecaca'}`
      }
    },
  };

  return (
    <>
      <Layout>{children}</Layout>
      <Toaster 
        position="bottom-right" 
        toastOptions={toastOptionsConfig}
      />
    </>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The <html> tag will have .dark or .light class from ThemeProvider */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-300`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
