import '@mantine/core/styles.css';
import './app.css';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FONT } from './lib/constants';

// 主役の色は、落ち着いた青（shade 8 = #2563A8）。色の数を絞って、落ち着いた公式な印象にする
const brand: MantineColorsTuple = [
  '#EEF3F8',
  '#DCE6F1',
  '#C2D3E7',
  '#A3BDDA',
  '#85A8CE',
  '#6692C2',
  '#4C7FB8',
  '#366FAF',
  '#2563A8',
  '#1D4D83',
];

const theme = createTheme({
  fontFamily: FONT.CSS_FAMILY,
  colors: { brand },
  primaryColor: 'brand',
  primaryShade: { light: 8, dark: 8 },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
);
