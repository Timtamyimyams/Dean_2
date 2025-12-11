import './globals.css'

export const metadata = {
  title: 'DEAN.NET Planning Board',
  description: 'Infinite canvas planning board',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
