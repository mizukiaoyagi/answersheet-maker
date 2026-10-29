import '@mantine/core/styles.css';
import './app.css';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FONT } from './lib/constants';

// 主役の色は、くすんだ深緑（shade 8 = #1f5f46）。色の数を絞って、落ち着いた公式な印象にする
const forest: MantineColorsTuple = [
  '#eef5f1',
  '#dbe9e1',
  '#bcd5c7',
  '#97bda8',
  '#73a48a',
  '#4f8b6d',
  '#357455',
  '#296a4e',
  '#1f5f46',
  '#174a37',
];

const theme = createTheme({
  fontFamily: FONT.CSS_FAMILY,
  colors: { forest },
  primaryColor: 'forest',
  primaryShade: { light: 8, dark: 8 },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
);
