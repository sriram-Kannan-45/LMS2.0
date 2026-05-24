import React from 'react'

/**
 * FloatingInput - A premium input component with floating label animation
 * 
 * @param {string} id - Unique identifier for the input
 * @param {string} label - Label text that becomes floating
 * @param {string} type - Input type (text, email, password, etc.)
 * @param {string} value - Current input value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Placeholder text (required for floating label)
 * @param {boolean} error - Whether input has an error
 * @param {string} errorMessage - Error message to display
 * @param {boolean} disabled - Whether input is disabled
 * @param {string} className - Additional CSS classes
 * @param {object} ...props - Additional props to pass to input
 */
const FloatingInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder = ' ',
  error = false,
  errorMessage = '',
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group-floating ${className}`}>
      <input
        id={id}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
      <label className="form-label" htmlFor={id}>{label}</label>
      {errorMessage && error && (
        <div className="form-validation-message invalid">
          <span>⚠</span> {errorMessage}
        </div>
      )}
    </div>
  )
}

/**
 * FloatingTextarea - A premium textarea component with floating label
 */
const FloatingTextarea = ({
  id,
  label,
  value,
  onChange,
  placeholder = ' ',
  error = false,
  errorMessage = '',
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group-floating ${className}`}>
      <textarea
        id={id}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        {...props}
      />
      <label className="form-label" htmlFor={id}>{label}</label>
      {errorMessage && error && (
        <div className="form-validation-message invalid">
          <span>⚠</span> {errorMessage}
        </div>
      )}
    </div>
  )
}

/**
 * FloatingSelect - A premium select component with floating label
 */
const FloatingSelect = ({
  id,
  label,
  value,
  onChange,
  options = [],
  error = false,
  errorMessage = '',
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group-floating ${className}`}>
      <select
        id={id}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      >
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <label className="form-label" htmlFor={id}>{label}</label>
      {errorMessage && error && (
        <div className="form-validation-message invalid">
          <span>⚠</span> {errorMessage}
        </div>
      )}
    </div>
  )
}

export { FloatingInput, FloatingTextarea, FloatingSelect }
export default FloatingInput