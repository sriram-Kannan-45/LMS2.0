import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Camera, Loader, Star } from 'lucide-react'

/**
 * TrainerImageDisplay - Component to display trainer profile images
 * Supports multiple view types: avatar, card, profile
 * 
 * Props:
 * - imageUrl: string - URL of trainer image
 * - trainerName: string - Name of trainer (for fallback)
 * - viewType: 'avatar' | 'card' | 'profile' (default: 'avatar')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - onClick: function - Optional click handler
 * - trainerTitle: string - Optional trainer title/subject
 * - trainerEmail: string - Optional email
 * - rating: number - Optional rating (0-5)
 */
const TrainerImageDisplay = ({
  imageUrl,
  trainerName = 'Trainer',
  viewType = 'avatar',
  size = 'md',
  onClick,
  trainerTitle,
  trainerEmail,
  rating,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(!!imageUrl)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const sizeMap = {
    sm: { avatar: 'w-9 h-9 text-xs', card: 'w-36', profile: 'w-44' },
    md: { avatar: 'w-12 h-12 text-sm', card: 'w-44', profile: 'w-52' },
    lg: { avatar: 'w-16 h-16 text-lg', card: 'w-52', profile: 'w-64' }
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    hover: { scale: 1.05 }
  }

  const avatarVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4 } }
  }

  // Avatar View - Circular profile pic with premium styling
  if (viewType === 'avatar') {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        onClick={onClick}
        className={`relative ${sizeMap[size].avatar} rounded-full flex-shrink-0 cursor-pointer group ${className}`}
      >
        {/* Background gradient fallback */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg" />

        {/* Image */}
        {imageUrl && !imageError ? (
          <motion.img
            variants={avatarVariants}
            src={imageUrl}
            alt={trainerName}
            onLoad={() => {
              setImageLoaded(true)
              setIsLoading(false)
            }}
            onError={() => {
              setImageError(true)
              setIsLoading(false)
            }}
            className="w-full h-full object-cover rounded-full border-2 border-white shadow-lg relative z-10"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white rounded-full border-2 border-white shadow-lg relative z-10" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {getInitials(trainerName)}
          </div>
        )}

        {/* Hover edit overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center z-20 transition-opacity"
        >
          <Camera size={size === 'sm' ? 10 : size === 'md' ? 14 : 18} className="text-white" />
        </motion.div>

        {/* Loading spinner */}
        {isLoading && imageUrl && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm z-20">
            <Loader size={size === 'sm' ? 12 : size === 'md' ? 16 : 20} className="text-white animate-spin" />
          </div>
        )}

        {/* Online status dot */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white z-30 shadow-sm" />

        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-40 opacity-0 group-hover:opacity-100 transition-opacity font-medium shadow-lg">
          {trainerName}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      </motion.div>
    )
  }

  // Card View - Modern card with image and name
  if (viewType === 'card') {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
        onClick={onClick}
        className={`${sizeMap[size].card} rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group ${className}`}
      >
        {/* Image Container */}
        <div className="relative aspect-square bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 overflow-hidden">
          {imageUrl && !imageError ? (
            <>
              <motion.img
                variants={avatarVariants}
                src={imageUrl}
                alt={trainerName}
                onLoad={() => {
                  setImageLoaded(true)
                  setIsLoading(false)
                }}
                onError={() => {
                  setImageError(true)
                  setIsLoading(false)
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Edit icon on hover */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Camera size={20} className="text-white" />
                </div>
              </motion.div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-2">
                <span className="text-white font-bold text-xl" style={{ fontFamily: 'Outfit, sans-serif' }}>{getInitials(trainerName)}</span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && imageUrl && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <Loader size={24} className="text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-slate-900 text-sm truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>{trainerName}</h3>
          {trainerTitle && (
            <p className="text-xs text-indigo-600 font-medium truncate mt-0.5">{trainerTitle}</p>
          )}
          {rating && (
            <div className="mt-2 flex items-center gap-1">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-amber-600">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // Profile View - Large profile card with details
  if (viewType === 'profile') {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        whileHover={{ y: -4 }}
        onClick={onClick}
        className={`${sizeMap[size].profile} rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all cursor-pointer group ${className}`}
      >
        {/* Image Container */}
        <div className="relative aspect-square bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
          {imageUrl && !imageError ? (
            <>
              <motion.img
                variants={avatarVariants}
                src={imageUrl}
                alt={trainerName}
                onLoad={() => {
                  setImageLoaded(true)
                  setIsLoading(false)
                }}
                onError={() => {
                  setImageError(true)
                  setIsLoading(false)
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-70 group-hover:opacity-50 transition-opacity" />
              
              {/* Camera overlay */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-2.5 bg-white/25 backdrop-blur-md rounded-xl border border-white/20">
                  <Camera size={18} className="text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center mb-3 backdrop-blur-sm">
                <span className="font-bold text-2xl" style={{ fontFamily: 'Outfit, sans-serif' }}>{getInitials(trainerName)}</span>
              </div>
              <p className="text-sm font-medium text-white/60">No photo</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && imageUrl && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <Loader size={32} className="text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5">
          <h3 className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{trainerName}</h3>
          
          {trainerTitle && (
            <p className="text-sm text-indigo-600 font-semibold mb-2">{trainerTitle}</p>
          )}

          {trainerEmail && (
            <p className="text-xs text-slate-500 mb-3 truncate">{trainerEmail}</p>
          )}

          {rating && (
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-slate-700">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // Fallback
  return null
}

export default TrainerImageDisplay
