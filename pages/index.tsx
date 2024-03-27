import * as React from 'react';

import { AppChat } from '../src/apps/chat/AppChat';

import { withLayout } from '~/common/layout/withLayout';

import { googleLogout, GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, CardContent, Grid } from '@mui/material';
import { Brand } from '~/common/app.config';

export default function IndexPage() {
  //============================ start of google auth realted stuff
  if (typeof window !== 'undefined') {
    console.log('we are running on the client');
  } else {
    console.log('we are running on the server');
  }

  const [profile, setProfile] = useState([]);
  //google auth

  const [userobj, setUserobj] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('userobj') as string);
    } else {
      return [];
    }
  });

  useEffect(() => {
    if (userobj !== undefined) {
      axios
        .get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${(userobj as any)?.access_token}`, {
          headers: {
            Authorization: `Bearer ${(userobj as any)?.access_token}`,
            Accept: 'application/json',
          },
        })
        .then((res) => {
          setProfile(res.data);
        })
        .catch((err) => console.log(err));
    }
  }, [userobj]);

  const handlelogin = useGoogleLogin({
    onSuccess: (codeResponse) => {
      if (typeof window !== 'undefined') {
        setUserobj(codeResponse);
        localStorage.setItem('userobj', JSON.stringify(codeResponse));
      }
      console.log(codeResponse);
    },
    onError: (error) => console.log('Login Failed:', error),
  });
  // log out function to log the user out of google and set the profile array to null
  const logOut = () => {
    googleLogout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userobj');
    }
    setProfile([]);
  };

  //==================================== end of google auth related stuff

  // TODO: This Index page will point to the Dashboard (or a landing page) soon
  // For now it offers the chat experience, but this will change. #299

  return (
    // <AppChat />
    <div>
      {(profile as any)?.id ? (
        // logged in , show app ui
        <div>
          {/*//   <img src={(profile as any)?.picture} alt="user image"/>*/}
          {/*//   <h3>User Logged in</h3>*/}
          {/*//   <p>Name: {(profile as any)?.name}</p>*/}
          <div
            style={{
              textAlign: 'right',
              marginRight: '40px',
              marginTop: '10px',
              marginBottom: '10px',
            }}
          >
            Account: {(profile as any)?.email + '  '}
            <button onClick={logOut}>Log out</button>
          </div>
          {/*  <AppChat/>*/}

          {withLayout({ type: 'optima' }, <AppChat />)}
        </div>
      ) : (
        // not logged in , show the login page
        <Grid container justifyContent={'center'} spacing={2}>
          <Grid item xs={10} md={8}>
            <Card>
              <CardContent>
                <h2 style={{ textAlign: 'center' }}>Welcome to {Brand.Title.Base}</h2>
              </CardContent>
              {/*<Button variant="contained" onClick={handlelogin}>*/}
              {/*  Login*/}
              {/*</Button>*/}
              <Button variant="contained" onClick={() => handlelogin()}>
                Sign in with Google 🚀
              </Button>
            </Card>
          </Grid>
        </Grid>
      )}
    </div>
  );
}
