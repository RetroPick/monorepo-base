import React from 'react';

interface LogoProps {
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Blue Background */}
            <rect width="100" height="100" rx="20" fill="#3b82f6" />

            {/* White Circle */}
            <circle cx="50" cy="50" r="35" fill="white" />

            {/* R Text - Approximation with SVG Path or Text */}
            <text
                x="50"
                y="65"
                fontSize="55"
                fontFamily="serif"
                fontStyle="italic"
                fontWeight="bold"
                fill="#3b82f6"
                textAnchor="middle"
            >
                R
            </text>

            {/* Sparkle */}
            <path
                d="M25 75 L28 65 L31 75 L41 78 L31 81 L28 91 L25 81 L15 78 Z"
                fill="white"
            />
        </svg>
    );
};

export default Logo;
