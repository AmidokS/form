<!DOCTYPE html>  
<html lang="ru">  
<head>  
  <meta charset="UTF-8">  
  <title>Бюджет</title>  
  <style>  
    body {  
      font-family: Arial, sans-serif;  
      margin: 20px;  
      background: #f5f5f5;  
      color: #333;  
    }  
    h1 {  
      text-align: center;  
    }  
    .balance {  
      font-size: 22px;  
      font-weight: bold;  
      text-align: center;  
      margin-bottom: 20px;  
    }  
    .form {  
      display: flex;  
      gap: 10px;  
      margin-bottom: 20px;  
    }  
    input, select, button {  
      padding: 10px;  
      font-size: 16px;  
    }  
    ul {  
      list-style: none;  
      padding: 0;  
    }  
    li {  
      margin: 5px 0;  
      padding: 8px;  
      background: #fff;  
      border-radius: 5px;  
    }  
  </style>  
</head>  
<body>  
  <h1>Бюджет</h1>  
  <div class="balance">Баланс: <span id="balance">0</span> zł</div>  
  
  <div class="form">  
    <select id="type">  
      <option value="income">Доход</option>  
      <option value="expense">Расход</option>  
    </select>  
    <input type="number" id="amount" placeholder="Сумма">  
    <button onclick="addTransaction()">Добавить</button>  
  </div>  
  
  <ul id="list"></ul>  
  
  <!-- Firebase SDK -->  
  <script type="module">  
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";  
    import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";  
  
    // Вставь сюда свой firebaseConfig  
    const firebaseConfig = {  
      apiKey: "AIzaSyBs6GtlBpCqx7a_ZQXPjDZ6Kp-YXRDgSjE",  
      authDomain: "my-budzet.firebaseapp.com",  
      projectId: "my-budzet",  
      storageBucket: "my-budzet.firebasestorage.app",  
      messagingSenderId: "388303046323",  
      appId: "1:388303046323:web:e6bdbadf863a68d28b92c6",  
      measurementId: "G-35WMNH12F0"  
    };  
  
    const app = initializeApp(firebaseConfig);  
    const db = getFirestore(app);  
    const transactionsRef = collection(db, "transactions");  
  
    const listEl = document.getElementById("list");  
    const balanceEl = document.getElementById("balance");  
    let balance = 0;  
  
    // Добавление транзакции в Firestore  
    async function addTransactionFirebase(type, amount, user) {  
      try {  
        await addDoc(transactionsRef, { type, amount, user, timestamp: new Date() });  
      } catch(e) {  
        console.error("Ошибка при добавлении документа: ", e);  
      }  
    }  
  
    // Кнопка "Добавить"  
    window.addTransaction = function() {  
      const type = document.getElementById("type").value;  
      const amount = parseFloat(document.getElementById("amount").value);  
      const user = prompt("Введите имя пользователя: 'я' или 'девушка'");  
      if (isNaN(amount) || amount <= 0) return alert("Введите сумму!");  
      addTransactionFirebase(type, amount, user);  
      document.getElementById("amount").value = "";  
    };  
  
    // Подписка на изменения в Firestore (обновление списка и баланса)  
    onSnapshot(transactionsRef, (snapshot) => {  
      listEl.innerHTML = "";  
      balance = 0;  
      snapshot.forEach((doc) => {  
        const data = doc.data();  
        const li = document.createElement("li");  
        li.textContent = `${data.user}: ${data.type === "income" ? "+ " : "- "}${data.amount} zł`;  
        listEl.appendChild(li);  
        balance += data.type === "income" ? data.amount : -data.amount;  
      });  
      balanceEl.textContent = balance;  
    });  
  </script>  
</body>  
</html>  
