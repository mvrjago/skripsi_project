import React from 'react';
import './About.css';

const About = () => {
  return (
    <div>
      <h1>How To Use</h1>
      <p className="text-justify slide-in">
        1. Pengguna memilih cakupan area: <br /> Pengguna dapat memilih area tertentu di mana mereka ingin melakukan perhitungan probabilitas tabrakan. Pilihan cakupan area ini akan menjadi dasar dalam pengambilan data pesawat terbang.
      </p>
      <p className="text-justify slide-in">
        2. Sistem melakukan pengambilan data antar pesawat: <br /> Setelah pengguna memilih cakupan area, sistem akan mengambil data pesawat terbang yang berada di dalam cakupan tersebut. Data ini meliputi informasi seperti posisi, kecepatan, arah, dan identifikasi pesawat (misalnya ICAO24).
      </p>
      <p className="text-justify slide-in">
        3. Sistem menampilkan visualisasi map dan pesawat terbang: <br /> Setelah data pesawat terbang diperoleh, sistem akan menampilkan visualisasi map yang mencakup area yang dipilih oleh pengguna. Pada visualisasi ini, pesawat terbang akan ditampilkan sesuai dengan posisi dan arah terbangnya.
      </p>
      <p className="text-justify slide-in">
        4. Perhitungan probabilitas jika vektor antar pesawat bersinggungan: <br /> 	Sistem akan memeriksa vektor antar pesawat yang ada dalam data yang diperoleh. Jika terdapat pesawat yang memiliki vektor yang bersinggungan, sistem akan melakukan perhitungan probabilitas tabrakan antara pesawat-pesawat tersebut.
      </p>
      <p className="text-justify slide-in">
        5. Menampilkan presentase perhitungan: <br /> Setelah perhitungan probabilitas selesai dilakukan, sistem akan menampilkan presentase hasil perhitungan tersebut. Presentase ini memberikan informasi tentang tingkat risiko tabrakan antara pesawat-pesawat yang bersinggungan.
      </p>
      <p className="text-justify slide-in">
        6. Memberikan notifikasi kepada pengguna: <br /> Jika probabilitas tabrakan antara pesawat-pesawat yang bersinggungan melebihi ambang batas yang ditentukan, sistem akan memberikan notifikasi kepada pengguna. Notifikasi ini berfungsi sebagai peringatan agar pengguna dapat mengambil tindakan yang sesuai.
      </p>
    </div>
  );
};


export default About;
