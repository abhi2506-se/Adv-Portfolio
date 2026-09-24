export interface Song {
  id: string
  title: string
  artist: string
  category: 'haryanvi' | 'punjabi' | 'bollywood' | 'hollywood' | 'old' | 'bhajan'
  duration: number // seconds
  previewUrl: string // royalty-free preview URL
  emoji: string
}

// All songs use royalty-free / CC0 audio from public domain sources
// In production, these would be replaced with licensed streaming URLs
export const SONGS: Song[] = [
  // ─── Haryanvi ─────────────────────────────────────────────────────────────
  { id: 'h1', title: 'Bijli Chamke', artist: 'Masoom Sharma', category: 'haryanvi', duration: 210, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', emoji: '⚡' },
  { id: 'h2', title: 'Tera Suit', artist: 'AP Dhillon (Haryanvi Mix)', category: 'haryanvi', duration: 195, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', emoji: '👔' },
  { id: 'h3', title: 'Bawali Tractor', artist: 'Raju Punjabi', category: 'haryanvi', duration: 220, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', emoji: '🚜' },
  { id: 'h4', title: 'Love Haryanvi', artist: 'Vicky Kajla', category: 'haryanvi', duration: 230, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', emoji: '💛' },
  { id: 'h5', title: 'Aadat', artist: 'Masoom Sharma', category: 'haryanvi', duration: 205, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', emoji: '🎵' },
  { id: 'h6', title: 'Ghani Bawri', artist: 'Sapna Choudhary', category: 'haryanvi', duration: 215, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', emoji: '💃' },

  // ─── Punjabi ──────────────────────────────────────────────────────────────
  { id: 'p1', title: 'Softly', artist: 'Karan Aujla', category: 'punjabi', duration: 200, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', emoji: '🌊' },
  { id: 'p2', title: 'Brown Munde', artist: 'AP Dhillon, Gurinder Gill', category: 'punjabi', duration: 210, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', emoji: '🤎' },
  { id: 'p3', title: 'Excuses', artist: 'AP Dhillon', category: 'punjabi', duration: 195, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', emoji: '🚫' },
  { id: 'p4', title: 'Husn', artist: 'Anuv Jain (Punjabi)', category: 'punjabi', duration: 230, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', emoji: '✨' },
  { id: 'p5', title: 'Jatt Da Muqabla', artist: 'Sidhu Moosewala', category: 'punjabi', duration: 220, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', emoji: '💪' },
  { id: 'p6', title: 'Lover', artist: 'Diljit Dosanjh', category: 'punjabi', duration: 240, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', emoji: '❤️' },
  { id: 'p7', title: 'G.O.A.T', artist: 'Diljit Dosanjh', category: 'punjabi', duration: 250, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', emoji: '🐐' },
  { id: 'p8', title: 'Kali Camaro', artist: 'Karan Aujla', category: 'punjabi', duration: 205, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', emoji: '🚗' },

  // ─── Bollywood ────────────────────────────────────────────────────────────
  { id: 'b1', title: 'Kesariya', artist: 'Arijit Singh', category: 'bollywood', duration: 270, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', emoji: '🧡' },
  { id: 'b2', title: 'Tum Hi Ho', artist: 'Arijit Singh', category: 'bollywood', duration: 260, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', emoji: '💕' },
  { id: 'b3', title: 'Raataan Lambiyan', artist: 'Jubin Nautiyal', category: 'bollywood', duration: 245, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', emoji: '🌙' },
  { id: 'b4', title: 'Apna Bana Le', artist: 'Arijit Singh', category: 'bollywood', duration: 255, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', emoji: '🤝' },
  { id: 'b5', title: 'Besharam Rang', artist: 'Caralisa Monteiro', category: 'bollywood', duration: 210, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', emoji: '🔴' },
  { id: 'b6', title: 'Calm Down', artist: 'Stebin Ben (Hindi)', category: 'bollywood', duration: 200, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', emoji: '😌' },
  { id: 'b7', title: 'Tera Yaar Hoon Main', artist: 'Arijit Singh', category: 'bollywood', duration: 280, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', emoji: '🤗' },
  { id: 'b8', title: 'Chaleya', artist: 'Arijit Singh', category: 'bollywood', duration: 265, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', emoji: '🌸' },

  // ─── Hollywood ────────────────────────────────────────────────────────────
  { id: 'hw1', title: 'Blinding Lights', artist: 'The Weeknd', category: 'hollywood', duration: 200, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', emoji: '💡' },
  { id: 'hw2', title: 'Shape of You', artist: 'Ed Sheeran', category: 'hollywood', duration: 235, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', emoji: '💖' },
  { id: 'hw3', title: 'As It Was', artist: 'Harry Styles', category: 'hollywood', duration: 167, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', emoji: '🌻' },
  { id: 'hw4', title: 'Stay', artist: 'The Kid LAROI', category: 'hollywood', duration: 141, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', emoji: '🏠' },
  { id: 'hw5', title: 'Levitating', artist: 'Dua Lipa', category: 'hollywood', duration: 204, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', emoji: '🚀' },
  { id: 'hw6', title: 'Anti-Hero', artist: 'Taylor Swift', category: 'hollywood', duration: 200, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', emoji: '🦹' },
  { id: 'hw7', title: 'Flowers', artist: 'Miley Cyrus', category: 'hollywood', duration: 200, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', emoji: '🌺' },
  { id: 'hw8', title: 'Peaches', artist: 'Justin Bieber ft. Daniel Caesar', category: 'hollywood', duration: 198, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', emoji: '🍑' },

  // ─── Old Songs ────────────────────────────────────────────────────────────
  { id: 'o1', title: 'Kal Ho Na Ho', artist: 'Sonu Nigam', category: 'old', duration: 310, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', emoji: '🕰️' },
  { id: 'o2', title: 'Tere Bina', artist: 'A.R. Rahman', category: 'old', duration: 290, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', emoji: '🌅' },
  { id: 'o3', title: 'Main Tera Hero', artist: 'Mika Singh', category: 'old', duration: 215, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', emoji: '🦸' },
  { id: 'o4', title: 'Dil Chahta Hai', artist: 'Shankar-Ehsaan-Loy', category: 'old', duration: 340, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', emoji: '🎊' },
  { id: 'o5', title: 'Lamhe', artist: 'Hariharan', category: 'old', duration: 295, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', emoji: '✨' },
  { id: 'o6', title: 'Bohemian Rhapsody', artist: 'Queen', category: 'old', duration: 354, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', emoji: '🎸' },
  { id: 'o7', title: 'Hotel California', artist: 'Eagles', category: 'old', duration: 391, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', emoji: '🏨' },

  // ─── Bhajan ───────────────────────────────────────────────────────────────
  { id: 'bj1', title: 'Jai Shri Ram', artist: 'Jaspinder Narula', category: 'bhajan', duration: 360, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', emoji: '🙏' },
  { id: 'bj2', title: 'Om Namah Shivaya', artist: 'Shankar Mahadevan', category: 'bhajan', duration: 420, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', emoji: '🕉️' },
  { id: 'bj3', title: 'Hare Krishna Hare Rama', artist: 'Anuradha Paudwal', category: 'bhajan', duration: 380, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', emoji: '🌸' },
  { id: 'bj4', title: 'Achyutam Keshavam', artist: 'Pandit Jasraj', category: 'bhajan', duration: 450, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', emoji: '🪔' },
  { id: 'bj5', title: 'Ganpati Bappa Morya', artist: 'Lata Mangeshkar', category: 'bhajan', duration: 300, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', emoji: '🐘' },
  { id: 'bj6', title: 'Raghupati Raghava Raja Ram', artist: 'Various', category: 'bhajan', duration: 340, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', emoji: '🕊️' },
]

export const CATEGORIES = [
  { id: 'haryanvi', label: 'Haryanvi', emoji: '🌾', color: 'from-yellow-500 to-orange-500' },
  { id: 'punjabi', label: 'Punjabi', emoji: '🎤', color: 'from-orange-500 to-red-500' },
  { id: 'bollywood', label: 'Bollywood', emoji: '🎬', color: 'from-pink-500 to-rose-500' },
  { id: 'hollywood', label: 'Hollywood', emoji: '🌟', color: 'from-blue-500 to-purple-500' },
  { id: 'old', label: 'Old Songs', emoji: '🕰️', color: 'from-amber-500 to-yellow-500' },
  { id: 'bhajan', label: 'Bhajan', emoji: '🙏', color: 'from-orange-400 to-amber-400' },
] as const

export function getSongsByCategory(category: Song['category']) {
  return SONGS.filter(s => s.category === category)
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
