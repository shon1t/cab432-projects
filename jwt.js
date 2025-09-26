const poolData = {
  UserPoolId: "ap-southeast-2_LoqVf6hsi", 
  ClientId: "1lfahjkrfk5roqd51oo6fmc2va", 
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const username = document.getElementById("regUsername").value;
  const password = document.getElementById("regPassword").value;
  const email = document.getElementById("regEmail").value;

  const attributeList = [
    new AmazonCognitoIdentity.CognitoUserAttribute({
      Name: "email",
      Value: email
    })
  ];

  userPool.signUp(username, password, attributeList, null, function(err, result) {
    if (err) {
      document.getElementById("registerMessage").innerText = err.message || JSON.stringify(err);
      return;
    }
    document.getElementById("registerMessage").innerText = "Registration successful! Please check your email for a confirmation code.";
    
  });
});