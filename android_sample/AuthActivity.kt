package com.synapse.auth

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.synapse.auth.databinding.ActivityAuthBinding // Assuming ViewBinding

/**
 * Example of a multi-screen Auth Activity logic in Kotlin.
 * Handles transitions between Login, Signup, and Reset flows.
 */
class AuthActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityAuthBinding
    private val authManager = AuthManager()
    
    private var currentEmail: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAuthBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupClickListeners()
    }

    private fun setupClickListeners() {
        // LOGIN
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString()
            val pass = binding.etPass.text.toString()
            showLoading(true)
            authManager.login(email, pass) { success, error ->
                showLoading(false)
                if (success) navigateToDashboard()
                else showError(error)
            }
        }

        // SIGN UP
        binding.btnSignUp.setOnClickListener {
            val email = binding.etEmail.text.toString()
            val pass = binding.etPass.text.toString()
            val name = binding.etName.text.toString()
            showLoading(true)
            authManager.signUp(email, pass, name) { success, error ->
                showLoading(false)
                if (success) navigateToDashboard()
                else showError(error)
            }
        }

        // FORGOT PASSWORD - STEP 1 (Send Email)
        binding.btnForgotPassword.setOnClickListener {
            val email = binding.etEmail.text.toString()
            if (email.isEmpty()) {
                showError("Please enter email")
                return@setOnClickListener
            }
            currentEmail = email
            showLoading(true)
            authManager.generateAndSendOTP(email) { success, error ->
                showLoading(false)
                if (success) showScreen(Screen.ENTER_CODE)
                else showError(error)
            }
        }

        // FORGOT PASSWORD - STEP 2 (Verify Code)
        binding.btnVerifyCode.setOnClickListener {
            val code = binding.etCode.text.toString()
            showLoading(true)
            authManager.verifyOTP(currentEmail, code) { success, error ->
                showLoading(false)
                if (success) showScreen(Screen.RESET_PASSWORD)
                else showError(error)
            }
        }

        // FORGOT PASSWORD - STEP 3 (Reset)
        binding.btnUpdatePassword.setOnClickListener {
            val newPass = binding.etNewPass.text.toString()
            val confirm = binding.etConfirmPass.text.toString()
            
            if (newPass != confirm) {
                showError("Passwords mismatch")
                return@setOnClickListener
            }

            showLoading(true)
            authManager.resetPassword(newPass) { success, error ->
                showLoading(false)
                if (success) {
                    Toast.makeText(this, "Success! Please Login", Toast.LENGTH_LONG).show()
                    showScreen(Screen.LOGIN)
                } else showError(error)
            }
        }
    }

    private enum class Screen { LOGIN, SIGNUP, ENTER_CODE, RESET_PASSWORD }

    private fun showScreen(screen: Screen) {
        // Logic to show/hide relevant layouts (Visibility.GONE / VISIBLE)
    }

    private fun showLoading(isLoading: Boolean) {
        binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        binding.btnAction.isEnabled = !isLoading
    }

    private fun showError(msg: String?) {
        Toast.makeText(this, msg ?: "Error occurred", Toast.LENGTH_SHORT).show()
    }

    private fun navigateToDashboard() {
        // Intent to DashboardActivity
    }
}
