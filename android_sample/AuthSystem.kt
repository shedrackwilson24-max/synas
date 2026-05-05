package com.synapse.auth

import android.os.Bundle
import android.util.Patterns
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue
import java.util.*

/**
 * Clean structure for a complete Authentication system in Android (Kotlin)
 * using Firebase Auth and Firestore.
 */

// --- DATA MODELS ---

data class UserProfile(
    val email: String,
    val name: String,
    val createdAt: Date = Date()
)

data class OTP(
    val email: String,
    val code: String,
    val expiresAt: Long,
    val used: Boolean = false
)

// --- AUTH SYSTEM CORE ---

class AuthManager {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    // 1. Sign Up
    fun signUp(email: String, pass: String, name: String, onResult: (Boolean, String?) -> Unit) {
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            onResult(false, "Invalid email format")
            return
        }
        if (pass.length < 6) {
            onResult(false, "Password too short")
            return
        }

        auth.createUserWithEmailAndPassword(email, pass)
            .addOnSuccessListener { result ->
                val uid = result.user?.uid ?: return@addOnSuccessListener
                val user = UserProfile(email, name)
                
                // Store in Firestore
                db.collection("users").document(uid).set(user)
                    .addOnSuccessListener { onResult(true, null) }
                    .addOnFailureListener { onResult(false, it.message) }
            }
            .addOnFailureListener { onResult(false, it.message) }
    }

    // 2. Login
    fun login(email: String, pass: String, onResult: (Boolean, String?) -> Unit) {
        auth.signInWithEmailAndPassword(email, pass)
            .addOnSuccessListener { onResult(true, null) }
            .addOnFailureListener { onResult(false, it.message) }
    }

    // 3. Forgot Password Flow
    
    // Step 2: Generate and Save OTP
    fun generateAndSendOTP(email: String, onResult: (Boolean, String?) -> Unit) {
        val code = (100000..999999).random().toString()
        val expiresAt = System.currentTimeMillis() + (10 * 60 * 1000) // 10 mins

        val otpData = hashMapOf(
            "email" to email,
            "code" to code,
            "expiresAt" to expiresAt,
            "used" to false,
            "createdAt" to FieldValue.serverTimestamp()
        )

        db.collection("otps").add(otpData)
            .addOnSuccessListener {
                // SIMULATION: Sending email
                println("SIMULATED MAIL To: $email | Code: $code")
                onResult(true, null)
            }
            .addOnFailureListener { onResult(false, it.message) }
    }

    // Step 3: Verify OTP
    fun verifyOTP(email: String, code: String, onResult: (Boolean, String?) -> Unit) {
        db.collection("otps")
            .whereEqualTo("email", email)
            .whereEqualTo("code", code)
            .whereEqualTo("used", false)
            .get()
            .addOnSuccessListener { snapshot ->
                if (snapshot.isEmpty) {
                    onResult(false, "Invalid or already used code")
                    return@addOnSuccessListener
                }

                val doc = snapshot.documents[0]
                val expiry = doc.getLong("expiresAt") ?: 0
                
                if (System.currentTimeMillis() > expiry) {
                    onResult(false, "Code expired")
                    return@addOnSuccessListener
                }

                // Mark as used
                doc.reference.update("used", true)
                onResult(true, null)
            }
            .addOnFailureListener { onResult(false, it.message) }
    }

    // Step 4: Reset Password
    fun resetPassword(newPass: String, onResult: (Boolean, String?) -> Unit) {
        val user = auth.currentUser
        if (user != null) {
            user.updatePassword(newPass)
                .addOnSuccessListener { onResult(true, null) }
                .addOnFailureListener { onResult(false, it.message) }
        } else {
            onResult(false, "No session found. Re-verify requested.")
        }
    }
}
