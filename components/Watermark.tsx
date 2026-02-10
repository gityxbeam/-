import React from 'react';

interface WatermarkProps {
  text: string;
  visible: boolean;
}

const Watermark: React.FC<WatermarkProps> = ({ text, visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex flex-wrap justify-center content-center opacity-10 select-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i} 
          className="transform -rotate-45 m-20 text-4xl font-black text-gray-800 whitespace-nowrap"
        >
          {text} <br/>
          <span className="text-sm font-normal">{new Date().toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
};

export default Watermark;