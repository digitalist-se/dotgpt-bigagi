import * as React from 'react';
import Head from 'next/head';
import { MyAppProps } from 'next/app';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';

import { Brand } from '~/common/app.config';
import { apiQuery } from '~/common/util/trpc.client';

import 'katex/dist/katex.min.css';
import '~/common/styles/CodePrism.css';
import '~/common/styles/GithubMarkdown.css';
import '~/common/styles/NProgress.css';
import '~/common/styles/app.styles.css';

import { ProviderBackendCapabilities } from '~/common/providers/ProviderBackendCapabilities';
import {GoogleOAuthProvider, useGoogleLogin} from "@react-oauth/google";
import { ProviderBootstrapLogic } from '~/common/providers/ProviderBootstrapLogic';
import { ProviderSingleTab } from '~/common/providers/ProviderSingleTab';
import { ProviderSnacks } from '~/common/providers/ProviderSnacks';
import { ProviderTRPCQuerySettings } from '~/common/providers/ProviderTRPCQuerySettings';
import { ProviderTheming } from '~/common/providers/ProviderTheming';
import { hasGoogleAnalytics, OptionalGoogleAnalytics } from '~/common/components/GoogleAnalytics';
import { isVercelFromFrontend } from '~/common/util/pwaUtils';


const MyApp = ({ Component, emotionCache, pageProps }: MyAppProps) =>
  <>

    <Head>
      <title>{Brand.Title.Common}</title>
      <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no" />
      <meta
        httpEquiv="Content-Security-Policy"
        content="default-src 'self' *.google.com *.googleapis.com;
        script-src 'self' 'unsafe-eval' 'unsafe-inline' *.google.com *.googleapis.com;
        style-src 'self' 'unsafe-inline';"/>
      <meta
        httpEquiv="Strict-Transport-Security"
        content="max-age=31536000; includeSubDomains"/>
    </Head>


    <GoogleOAuthProvider clientId="256517722247-st7cld81nhtd9fjhhnlgv2v5fb36qu9k.apps.googleusercontent.com">
    <ProviderTheming emotionCache={emotionCache}>
      <ProviderSingleTab>
        <ProviderTRPCQuerySettings>
          <ProviderBackendCapabilities>
            {/* ^ SSR boundary */}
            <ProviderBootstrapLogic>
              <ProviderSnacks>
                <Component {...pageProps} />
              </ProviderSnacks>
            </ProviderBootstrapLogic>
          </ProviderBackendCapabilities>
        </ProviderTRPCQuerySettings>
      </ProviderSingleTab>
    </ProviderTheming>
    </GoogleOAuthProvider>

    {isVercelFromFrontend && <VercelAnalytics debug={false} />}
    {isVercelFromFrontend && <VercelSpeedInsights debug={false} sampleRate={1 / 2} />}
    {hasGoogleAnalytics && <OptionalGoogleAnalytics />}

  </>;

// enables the React Query API invocation
export default apiQuery.withTRPC(MyApp);