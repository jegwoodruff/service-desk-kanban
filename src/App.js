import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Board from './components/Board/Board';

const theme = createTheme({
  typography: {
    fontFamily: ['Futura PT', 'sans-serif'].join(', '),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Board dashboardId="1" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
