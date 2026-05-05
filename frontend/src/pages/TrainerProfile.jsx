import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Camera, Calendar, Phone, MapPin, Award, Briefcase, Save, Loader, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../components/Toast'

import { API_BASE as API } from '../api/api'

function TrainerProfile({ user, onLogout }) {
  const [profile, setProfile] = useState({
    dob: '',
    phone: '',
    address: '',
    qualification: '',
    experience: '',
    name: ''
  })
  const [profileImage, setProfileImage] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${user.token}`
  })

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API}/trainer/profile`, {
        headers: getAuthHeader()
      })
      const data = await response.json()
      if (data.profile) {
        setProfile({
          dob: data.profile.dob || '',
          phone: data.profile.phone || '',
          address: data.profile.address || '',
          qualification: data.profile.qualification || '',
          experience: data.profile.experience || '',
          name: data.profile.user?.name || user.name || ''
        })
        if (data.profile.imagePath) {
          if (data.profile.imagePath.startsWith('data:')) {
            setPreviewImage(data.profile.imagePath)
          } else {
            setPreviewImage(`${API}/uploads/${data.profile.imagePath}`)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProfileImage(file)
      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      // DO NOT use JSON, Use FormData
      const formData = new FormData()
      formData.append("phone", profile.phone)
      formData.append("dob", profile.dob)
      formData.append("profilePic", profileImage)

      // Include other fields just in case they are needed, though the prompt focused on phone, dob, profilePic
      formData.append("name", profile.name)
      formData.append("address", profile.address)
      formData.append("qualification", profile.qualification)
      formData.append("experience", profile.experience)

      const response = await axios.put(
        `${API}/update-profile`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${user.token}`
          }
        }
      )

      setMessage(response.data.message || 'Profile updated successfully')
      toast.success('Profile updated successfully!')
      setProfileImage(null)
      // Fetch updated profile
      setTimeout(() => fetchProfile(), 500)
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value })
  }

  const getInitials = (name) => {
    return name
      ? name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'TR'
  }

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  }

  const itemVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <User className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              My Profile
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your trainer profile and preferences
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader className="animate-spin text-indigo-500 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading your profile...</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {getInitials(profile.name)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover overlay */}
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Camera className="text-white" size={24} />
                </motion.div>

                {/* Status dot */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-white flex items-center justify-center shadow-md">
                  <CheckCircle size={10} className="text-white" />
                </div>
              </motion.div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-slate-900">{profile.name || 'Trainer'}</h3>
                <p className="text-sm text-indigo-600 font-medium mt-1">{user.role}</p>
                <p className="text-xs text-slate-500 mt-2">Click the avatar to change your photo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold text-sm rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Upload size={14} />
                  Upload Photo
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Personal Info Grid */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <User size={14} className="inline mr-1.5 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Calendar size={14} className="inline mr-1.5 text-slate-400" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={profile.dob}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Phone size={14} className="inline mr-1.5 text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                />
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Award size={14} className="inline mr-1.5 text-slate-400" />
                  Qualification
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={profile.qualification}
                  onChange={handleChange}
                  placeholder="e.g., B.Sc, M.Sc, Ph.D"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                />
              </div>
            </div>

            {/* Address - full width */}
            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin size={14} className="inline mr-1.5 text-slate-400" />
                Address
              </label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Enter your address"
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 resize-none"
              />
            </div>

            {/* Experience - full width */}
            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Briefcase size={14} className="inline mr-1.5 text-slate-400" />
                Experience
              </label>
              <textarea
                name="experience"
                value={profile.experience}
                onChange={handleChange}
                placeholder="Describe your teaching experience"
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 resize-none"
              />
            </div>
          </motion.div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700"
              >
                <CheckCircle size={18} className="flex-shrink-0" />
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <motion.div variants={itemVariants}>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold rounded-xl transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Profile
                </>
              )}
            </motion.button>
          </motion.div>
        </form>
      )}
    </motion.div>
  )
}

export default TrainerProfile