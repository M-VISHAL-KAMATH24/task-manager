import React, { useState, useEffect } from "react";
import { auth, firestore } from "./firebase";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, updateDoc, deleteDoc, getDocs, query, where, doc } from "firebase/firestore";
import "./App.css";

function App() {
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState("top");
  const [deadline, setDeadline] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); // To store messages

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (user) {
      // Fetching upcoming tasks
      const tasksQuery = query(collection(firestore, "tasks"), where("uid", "==", user.uid), where("done", "==", false));
      const tasksSnapshot = await getDocs(tasksQuery);
      setTasks(tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  
      // Fetching completed tasks
      const completedTasksQuery = query(collection(firestore, "tasks"), where("uid", "==", user.uid), where("done", "==", true));
      const completedTasksSnapshot = await getDocs(completedTasksQuery);
      setCompletedTasks(completedTasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };
  

  const handleTaskChange = (e) => {
    setTask(e.target.value);
  };

  const handlePriorityChange = (e) => {
    setPriority(e.target.value);
  };

  const handleDeadlineChange = (e) => {
    setDeadline(e.target.value);
  };

  const addTask = async () => {
    if (!user) {
      alert("You must be logged in to add tasks.");
      return;
    }

    if (task.trim() === "") {
      alert("Please enter a task and select a valid deadline.");
      return;
    }

    if (editingTaskId !== null) {
      // Edit existing task
      const taskDocRef = doc(firestore, "tasks", editingTaskId);
      await updateDoc(taskDocRef, {
        task,
        priority,
        deadline
      });
      const updatedTasks = tasks.map(t =>
        t.id === editingTaskId ? { ...t, task, priority, deadline } : t
      );
      setTasks(updatedTasks);
      setEditingTaskId(null); // Reset after editing
    } else {
      // Add new task
      const newTask = {
        task,
        priority,
        deadline,
        done: false,
        uid: user.uid
      };
      const docRef = await addDoc(collection(firestore, "tasks"), newTask);
      setTasks([...tasks, { id: docRef.id, ...newTask }]);
    }

    setTask("");
    setPriority("top");
    setDeadline("");
  };

  const markDone = async (id) => {
    const taskDocRef = doc(firestore, "tasks", id);
    try {
      await updateDoc(taskDocRef, { done: true });
      fetchTasks();
    } catch (error) {
      console.error("Error marking task as done: ", error);
    }

    const completedTask = tasks.find((t) => t.id === id);
    if (completedTask) {
      setCompletedTasks([...completedTasks, completedTask]);
    }
  };

  const deleteTask = async (id) => {
    const taskDocRef = doc(firestore, "tasks", id);
    try {
      await deleteDoc(taskDocRef);
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task: ", error);
    }
  };

  const deleteCompletedTask = async (id) => {
    const taskDocRef = doc(firestore, "tasks", id);
    try {
      await deleteDoc(taskDocRef);
      setCompletedTasks(completedTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting completed task: ", error);
    }
  };

  const deleteAllCompletedTasks = async () => {
    const batchDelete = completedTasks.map(async (task) => {
      const taskDocRef = doc(firestore, "tasks", task.id);
      try {
        await deleteDoc(taskDocRef);
      } catch (error) {
        console.error("Error deleting completed task: ", error);
      }
    });

    await Promise.all(batchDelete);
    setCompletedTasks([]); // Clear the completedTasks state
  };

  const register = async () => {
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }
  
    try {
      // Attempt to create a new user
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("Registration successful! Please log in.");
      setEmail("");
      setPassword("");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setMessage("User already exists. Please log in to your account.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Invalid email format. Please enter a valid email.");
      } else {
        console.error("Error registering: ", error);
        setMessage("Error registering. Please try again.");
      }
    }
  };
  
  
  
  
  const checkIfUserExists = async (email) => {
    const usersRef = collection(firestore, "users"); // Adjust collection name as needed
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };
  
  
  
  const login = async () => {
    try {
      // Attempt to sign in
      await signInWithEmailAndPassword(auth, email, password);
      setMessage(""); // Clear any previous message
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Check Firestore to confirm if the email exists
        const userExists = await checkIfUserExists(email);
        if (!userExists) {
          // If the user is not found in Firestore, prompt to register
          alert("It seems you are a new user. Please register first.");
        } else {
          // If the user exists in Firestore but failed to sign in, log the error
          alert("Error logging in.please enter the correct email format");
        }
      } else {
        console.error("Error logging in: ", error);
        alert("Error logging in.incorrect password or username");
      }
    }
  };
  
  const logout = async () => {
    try {
      await signOut(auth);
      // Clear all state when logging out
      setTasks([]);
      setCompletedTasks([]);
      setTask("");
      setPriority("top");
      setDeadline("");
      setEditingTaskId(null);
      setEmail("");
      setPassword("");
      setMessage(""); // Clear any messages
      console.log("Logout successful and state cleared");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setTask(task.task);
    setPriority(task.priority);
    setDeadline(task.deadline);
  };

  const upcomingTasks = tasks.filter((t) => !t.done);

  return (
    <div className="App">
      <header>
        <h1>Task Scheduler</h1>
        {user ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <>
            <input
              className="head-input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              className="head-input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <button className="register_button" onClick={register}>Register</button>
            <button className="login_button" onClick={login}>Login</button>
          </>
        )}
        {message && <p className="message">{message}</p>}
      </header>
      <main>
        <div className="task-form">
          <input
            type="text"
            id="task"
            placeholder="Enter task..."
            value={task}
            onChange={handleTaskChange}
          />
          <select
            id="priority"
            value={priority}
            onChange={handlePriorityChange}
          >
            <option value="top">Top Priority</option>
            <option value="middle">Middle Priority</option>
            <option value="low">Less Priority</option>
          </select>
          <input
            type="date"
            id="deadline"
            value={deadline}
            onChange={handleDeadlineChange}
          />
          <button id="add-task" onClick={addTask}>
            {editingTaskId ? "Update Task" : "Add Task"}
          </button>
        </div>
        <h2 className="heading">Upcoming Tasks</h2>
        <div className="task-list" id="task-list">
          <table>
            <thead>
              <tr>
              <th>Task Name</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingTasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.task}</td>
                  <td>{t.priority}</td>
                  <td>{t.deadline}</td>
                  <td>
                    {!t.done && (
                      <button
                        className="mark-done"
                        onClick={() => markDone(t.id)}
                      >
                        Mark Done
                      </button>
                    )}
                    <button
                      className="edit-task"
                      onClick={() => startEditingTask(t)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-task"
                      onClick={() => deleteTask(t.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="completed-task-list">
          <h2 className="cheading">Completed Tasks</h2>
          <button className="delete-all-completed" onClick={deleteAllCompletedTasks}>
            Delete All Completed Tasks
          </button>
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {completedTasks.map((ct) => (
                <tr key={ct.id}>
                  <td>{ct.task}</td>
                  <td>{ct.priority}</td>
                  <td>{ct.deadline}</td>
                  <td>
                    <button
                      className="delete-completed-task"
                      onClick={() => deleteCompletedTask(ct.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;

            
