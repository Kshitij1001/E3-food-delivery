import { AppType } from 'next/dist/shared/lib/utils'
import Head from 'next/head'
import { trpc } from '../utils/trpc'
import '../styles/dist.css'

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Driver Portal</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default trpc.withTRPC(MyApp)
