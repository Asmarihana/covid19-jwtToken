const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let db = null;
const app = express();
app.use(express.json());

const initializationAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializationAndServer();
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "asmaasmaasma");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "asmaasmaasma", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

///API2
app.get("/states/", authenticateToken, async (request, response) => {
  const getQuery = `SELECT * FROM state`;
  const method = (obj) => {
    return {
      stateId: obj.state_id,
      stateName: obj.state_name,
      population: obj.population,
    };
  };
  const stateQuery = await db.all(getQuery);
  response.send(stateQuery.map((each) => method(each)));
});

///API3
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getIdQuery = `SELECT * FROM state WHERE state_id=${stateId};`;
  const method = (obj) => {
    return {
      stateId: obj.state_id,
      stateName: obj.state_name,
      population: obj.population,
    };
  };
  const stateIdQuery = await db.get(getIdQuery);
  response.send(method(stateIdQuery));
});

///api4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
                       VALUES('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}')`;
  const dbResponse = await db.run(postQuery);
  response.send("District Successfully Added");
});
///api5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getQuery = `SELECT * FROM district WHERE district_id=${districtId};`;
    const method = (obj) => {
      return {
        districtId: obj.district_id,
        districtName: obj.district_name,
        stateId: obj.state_id,
        cases: obj.cases,
        cured: obj.cured,
        active: obj.active,
        deaths: obj.deaths,
      };
    };
    const districtQuery = await db.get(getQuery);
    response.send(method(districtQuery));
  }
);

///api6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `DELETE FROM district WHERE district_id=${districtId};`;
    await db.run(deleteQuery);
    response.send("District Removed");
  }
);
///api7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateQuery = `UPDATE district
                           SET 
                          district_name='${districtName}',
                          state_id='${stateId}',
                           cases='${cases}',
                           cured='${cured}',
                           active='${active}',
                           deaths='${deaths}'`;
    await db.run(updateQuery);
    response.send("District Details Updated");
  }
);
///API8
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getQuery = `SELECT sum(cases) AS cases,
  sum(cured) AS cured,
  sum(active) AS  active,
  sum(deaths) AS deaths
  FROM district
 WHERE state_id=${stateId}; `;
    const method = (obj) => {
      return {
        totalCases: obj.cases,
        totalCured: obj.cured,
        totalActive: obj.active,
        totalDeaths: obj.deaths,
      };
    };
    const getTotal = await db.get(getQuery);
    response.send(method(getTotal));
  }
);
module.exports = app;
