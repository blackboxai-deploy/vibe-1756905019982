import './globals.css';

export const metadata = {
  title: 'Dynamic Placeholder Image Service',
  description: 'Generate placeholder images that automatically upgrade to AI-generated content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}