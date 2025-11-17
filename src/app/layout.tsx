import { auth } from "@/auth";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/AppSideBar";
import { Toaster } from "@/components/ui/sonner";

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
      </body>
    </html>
  );
}