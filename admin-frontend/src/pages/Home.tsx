// import React from 'react';
import TopDealsBox from '../components/topDealsBox/TopDealsBox';
import SystemStatus from '../components/SystemStatus';

const Home = () => {
  return (
    // screen
    <div className="home w-full p-0 m-0">
      {/* grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 grid-flow-dense auto-rows-[minmax(200px,auto)] xl:auto-rows-[minmax(150px,auto)] gap-3 xl:gap-3 px-0">
        <div className="box col-span-full sm:col-span-1 xl:col-span-1 row-span-3 3xl:row-span-5">
          <TopDealsBox />
        </div>
      </div>
      
      {/* System Status Section */}
      <div className="mt-6">
        <SystemStatus />
      </div>
    </div>
  );
};

export default Home;
