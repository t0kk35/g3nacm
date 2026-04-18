import { auth } from "@/auth";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/AppSideBar";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import "./globals.css";
import { Footer } from "@/components/common/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "g3nACM",
  description: "Generative AI Alert and Case Manager",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  const session = await auth()
  const user = session?.user
  const cookieStore = await cookies();
  const sideBarOpen = cookieStore.get("sidebar_state")?.value === 'true';
  // Use user local, revert to system if not available
  const locale = user?.locale ? user?.locale : await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SidebarProvider defaultOpen={sideBarOpen}>
              <AppSidebar userName={user?.name} />
              <SidebarInset>
                <div className="flex flex-1 flex-col min-h-screen">
                <main className="flex flex-1 flex-col">
                  <SidebarTrigger />
                  {children}
                </main>
                <Toaster richColors />
                <Footer/>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}